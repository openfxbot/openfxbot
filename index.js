'use strict';

var _ = require('lodash');
var moment = require('moment');
var RL = require('./rl.js');
var Rx = require('rx');
var fs = require('fs');
var stringify = require('csv-stringify');
var stats = require('stats-lite');

var nconf = require('nconf');
nconf.argv();

var TRAVIS_JOB_NUMBER = process.env.TRAVIS_JOB_NUMBER;
var data = require(nconf.get('data') || './data.js');
var dataSize = data.length;
var testSize = parseInt(nconf.get('test-size') || 52);

var outputFile = nconf.get('output-file') || moment().format('YYYY-DDD-hh');
var filePath = './neurons/' + outputFile + '.json';

var marr = (parseFloat(nconf.get('marr')) || 0.03) / 52.0; // minimum annual rate of return / 52wks
var maxTime = (parseInt(nconf.get('max-time'), 10) || 45) * 60 * 1000;

var startTime = new Date();
var stream = Rx.Observable.from(data);
var iterate = function(args){
	var env = {};
	var numStates = args.numStates || 26;
	var candleSize = args.version == '1.0' ? 5 : 4;
	var lastTestIndex = (dataSize - (2 * numStates + testSize));
	env.getNumStates = function() { return numStates * candleSize }
	env.getMaxNumActions = function() { return 3; }

	var spec = { gamma: args.gamma, epsilon: args.epsilon, alpha: args.alpha };
	var agent = new RL.DQNAgent(env, spec); 

	if(args.weights) {
		agent.fromJSON(args.weights);
	}

	var wealth = 0.0;
	var index = 0;
	var testTotalReward = 0.0;
	var decisions = {
		long: 0, short: 0, hold: 0, correct: 0, wrong: 0, reward: {
			min: 0.0, max: 0.0, wrong: 0.0, correct: 0.0
		}
	};

	stream
		.scan(function(candles, candle) {
			candles.push(candle);
			if(candles.length > args.numStates) {
				candles = candles.slice(candles.length - args.numStates);
			}
			return candles;
		}, [])
		.filter(function(candles) {
			return candles.length === args.numStates;
		})
		.map(function(candles) {
			var closeData = _.map(candles, function(candle) {
				return candle[3];
			});

			var lastCandle = candles[candles.length - 1];
			var lastClose = lastCandle[3];
			var mean = stats.mean(closeData);
			var meanDistance = (lastClose / stats.mean(closeData)) - 1.0;

			return args.version === '1.0'
				? [lastCandle[0], lastCandle[1], lastCandle[2], lastCandle[3], meanDistance]
				: lastCandle;

		})
		.map(function(ohlcCandle) {
			var priceOpen = ohlcCandle[0];
			var priceHigh = ohlcCandle[1];
			var priceLow = ohlcCandle[2];
			var priceClose = ohlcCandle[3];
			var percentChange = (priceClose / priceOpen) - 1.0;
			var percentHigh = (priceHigh / priceOpen) - 1.0;
			var percentLow = (priceLow / priceOpen) - 1.0;
			var pivotPoint = (priceHigh + priceLow + priceClose) / 3.0;
			var percentOpen = (priceClose / pivotPoint) - 1.0;

			var modifiedCandle = args.version === '1.0'
				? [
					percentChange * args.sensitivity,
					percentOpen * args.sensitivity,
					percentHigh * args.sensitivity,
					percentLow * args.sensitivity,
					ohlcCandle[4]
				]
				: [
					percentChange * args.sensitivity,
					percentOpen * args.sensitivity,
					percentHigh * args.sensitivity,
					percentLow * args.sensitivity
				];

			return modifiedCandle;
		})
		.reduce(function(acc, modifiedCandle) {
			var percentChange = modifiedCandle[0];
			var percentExtremes  = modifiedCandle[2] - modifiedCandle[3];
			var potentialProfit = Math.abs(percentChange);
			var normalizedReward = potentialProfit / percentExtremes;
			var bullish = percentChange > 0.0;

			if(acc.previousAction !== null) {
				var correctAction = bullish
					? 1
					: 0;

				var multiplier = acc.previousAction === correctAction
					? 1.0
					: -1.0;

				multiplier = acc.previousAction < 2
					? multiplier
					: 0.0;

				var reward = acc.previousAction < 2
					? multiplier * potentialProfit
					: (-1.0) * marr;

				var normalizedReward = acc.previousAction < 2
					? multiplier * (potentialProfit / percentExtremes)
					: (-1.0) * marr;

				if(++index < lastTestIndex) {
					agent.learn(normalizedReward);
				} else {
					if(acc.previousAction === 2) {decisions.hold++;}
					else if(acc.previousAction === 1) {decisions.long++;}
					else {decisions.short++;}

					if(multiplier > 0.0) {decisions.correct++;}
					else if(multiplier < 0.0) {decisions.wrong++;}

					decisions.reward.min = Math.min(decisions.reward.min, reward);
					decisions.reward.max = Math.max(decisions.reward.max, reward);
					if(reward < 0 ) {
						decisions.reward.wrong = decisions.reward.wrong + reward;
					} else {
						decisions.reward.correct = decisions.reward.correct + reward;
					}
					if(decisions.reward.min < 0.0) {
						decisions.reward.ratio = Math.abs(decisions.reward.max / decisions.reward.min);
					}
					if(decisions.reward.wrong < 0.0) {
						decisions.reward.odds = Math.abs(decisions.reward.correct / decisions.reward.wrong);
					}

					wealth += reward;
					testTotalReward += potentialProfit;
				}
			}
			
			var tmpAlpha = agent.epsilon;
			var tmpEpsilon = agent.epsilon;
			acc.candles.push(modifiedCandle);
			if(acc.candles.length > numStates) {
				acc.candles.shift();

				if(index >= lastTestIndex) {
					agent.alpha = 0.0;
					agent.epsilon = 0.0;
				}
				acc.previousAction = agent.act(_.flatten(acc.candles));
				agent.alpha = tmpAlpha;
				agent.epsilon = tmpEpsilon;
			}

			return acc
		}, {previousAction: null, candles: []})
		.subscribeOnCompleted(function() {
			var weights = agent.toJSON();
			args.weights = weights;
			var cycles = args.cycles;
			args.cycles = cycles + 1;

			var odds = decisions.correct / decisions.wrong;
			var b = odds - 1.0;
			var p = wealth / testTotalReward;
			var q = (1.0 - p);
			var meetsCriterion = (b > q / p);

			var percentSuccess = p * 100.0;

			var row = [
				[
					outputFile,
					TRAVIS_JOB_NUMBER,
					args.cycles,
					wealth,
					percentSuccess,
					JSON.stringify(decisions)
				]
			];
			stringify(row, function(err, formattedRow) {
				if(wealth > args.max.wealth) {
					if(!args.max.meetsCriterion || meetsCriterion) {
						process.stdout.write(formattedRow);
						args.max = {
							lastUpdatedDate: new Date(),
							meetsCriterion: meetsCriterion,
							cycles: cycles,
							wealth: wealth,
							percentSuccess: p,
							odds: odds,
							weights: weights
						};
					} else {
						process.stderr.write(formattedRow);
					}
				} else {
					process.stderr.write(formattedRow);
				}

				var currentTime = new Date();
				var duration = currentTime - startTime;

				if(duration < maxTime) { setImmediate(iterate, args); }
				else {
					fs.writeFile(filePath, JSON.stringify(args), () => {
						process.exit();
					});
				}
			});
		});
}

function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

var initArgs;
var minStates = nconf.get('min-states') || 1.0;
var minSensitivity = parseFloat(nconf.get('min-sensitivity') || 10.0);
var maxSensitivity = parseFloat(nconf.get('max-sensitivity') || 20.0);
var minAlpha = nconf.get('min-alpha') || 0.0;
var maxAlpha = nconf.get('max-alpha') || 0.1;
var minGamma = nconf.get('min-gamma') || 0.0;
var maxGamma = nconf.get('max-gamma') || 1.0;
var minEpsilon = nconf.get('min-epsilon') || 0.0;
var maxEpsilon = nconf.get('max-epsilon') || 0.5;

try {
	initArgs = require(filePath);
} catch(e) {
	initArgs = {
		version: '1.0',
		numStates: Math.floor(getRandom(minStates, 53)),
		sensitivity: getRandom(minSensitivity, maxSensitivity),
		alpha: getRandom(minAlpha, maxAlpha),
		gamma: getRandom(minGamma, maxGamma),
		epsilon: getRandom(minEpsilon, maxEpsilon),
		cycles: 0,
		max: {
			meetsCriterion: false,
			wealth: 0.0
		}
	}
}
console.error('initArgs:', JSON.stringify(initArgs));

iterate(initArgs);
