'use strict';

var _ = require('lodash');
var moment = require('moment');
var RL = require('./rl.js');
var Rx = require('rx');
var fs = require('fs');
var stringify = require('csv-stringify');

var nconf = require('nconf');
nconf.argv();

var TRAVIS_JOB_NUMBER = process.env.TRAVIS_JOB_NUMBER;
var data = require(nconf.get('data') || './data.js');
var dataSize = data.length;
var testSize = parseInt(nconf.get('test-size') || 52);

var outputFile = nconf.get('output-file') || moment().format('YYYY-WW-hh');
var filePath = './neurons/' + outputFile + '.json';

var marr = (parseFloat(nconf.get('marr')) || 0.03) / 52.0; // minimum annual rate of return / 52wks
var maxTime = (parseInt(nconf.get('max-time'), 10) || 45) * 60 * 1000;

var startTime = new Date();
var stream = Rx.Observable.from(data);
var iterate = function(args){
	var env = {};
	var numStates = args.numStates || 26;
	env.getNumStates = function() { return numStates * 4; }
	env.getMaxNumActions = function() { return 3; }

	var spec = { gamma: args.gamma, epsilon: args.epsilon, alpha: args.alpha };
	var agent = new RL.DQNAgent(env, spec); 

	if(args.weights) {
		agent.fromJSON(args.weights);
	}

	var wealth = 0.0;
	var index = 0;
	var testTotalReward = 0.0;
	var decisions = {long: 0, short: 0, hold: 0, correct: 0, wrong: 0, reward: {min: 0.0, max: 0.0}};

	stream
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

			var modifiedCandle = [
				percentChange * args.sensitivity,
				percentOpen * args.sensitivity,
				percentHigh * args.sensitivity,
				percentLow * args.sensitivity
			];

			return modifiedCandle;
		})
		.reduce(function(acc, modifiedCandle) {
			var percentChange = modifiedCandle[0];
			var potentialProfit = Math.abs(percentChange);
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

				var lastTestIndex = (dataSize - (numStates + testSize));

				if(++index < lastTestIndex) {
					agent.learn(reward);
				} else {
					if(acc.previousAction === 2) {decisions.hold++;}
					else if(acc.previousAction === 1) {decisions.long++;}
					else {decisions.short++;}

					if(multiplier > 0.0) {decisions.correct++;}
					else if(multiplier < 0.0) {decisions.wrong++;}

					decisions.reward.min = Math.min(decisions.reward.min, reward);
					decisions.reward.max = Math.max(decisions.reward.max, reward);
					if(decisions.reward.min < 0.0) {
						decisions.reward.ratio = Math.abs(decisions.reward.max / decisions.reward.min);
					}

					wealth += reward;
					testTotalReward += potentialProfit;
				}
			}
			
			var tmpEpsilon = agent.epsilon;
			acc.candles.push(modifiedCandle);
			if(acc.candles.length > numStates) {
				acc.candles.shift();

				if(index >= lastTestIndex) {
					agent.epsilon = 0.0;
				}
				acc.previousAction = agent.act(_.flatten(acc.candles));
				agent.epsilon = tmpEpsilon;
			}

			return acc
		}, {previousAction: null, candles: []})
		.subscribeOnCompleted(function() {
			var percentSuccess = (wealth / testTotalReward) * 100.0;

			var weights = agent.toJSON();
			args.weights = weights;
			var cycles = args.cycles;
			args.cycles = cycles + 1;

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
					process.stdout.write(formattedRow);
					args.max = {
						cycles: cycles,
						wealth: wealth,
						percentSuccess: percentSuccess / 100.0,
						odds: decisions.reward.ratio,
						weights: weights
					};
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
var minSensitivity = nconf.get('min-sensitivity') || 1.0;
var maxSensitivity = nconf.get('max-sensitivity') || 20.0;
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
		numStates: Math.floor(getRandom(minStates, 53)),
		sensitivity: getRandom(minSensitivity, maxSensitivity),
		alpha: getRandom(minAlpha, maxAlpha),
		gamma: getRandom(minGamma, maxGamma),
		epsilon: getRandom(minEpsilon, maxEpsilon),
		cycles: 0,
		max: {
			wealth: 0.0
		}
	}
}
console.error('initArgs:', JSON.stringify(initArgs));

iterate(initArgs);
