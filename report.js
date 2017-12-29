'use strict';

var _ = require('lodash');
var assert = require('assert');
var RL = require('./rl.js');
var Rx = require('rx');
var stringify = require('csv-stringify');
var stats = require('stats-lite');

var nconf = require('nconf');
nconf.argv();

var data = require(nconf.get('data') || './data.js');
var dataSize = data.length;
var querySize = parseInt(nconf.get('query-size') || 1);

var currency = nconf.get('currency');
var configFile = nconf.get('config-file');
assert.ok(configFile, '``--config-file` was not provided')

var agentsDir = process.env.DIR_AGENTS || './neurons';
var filePath = agentsDir + '/' + configFile;

function report(args){
	var env = {};
	var numStates = args.numStates || 26;
	var candleSize = args.version == '1.0' ? 5 : 4;
	var lastTestIndex = (dataSize - (2 * numStates + querySize) + 1);
	env.getNumStates = function() { return numStates * candleSize }
	env.getMaxNumActions = function() { return 3; }

	var spec = { gamma: args.gamma, epsilon: 0.0, alpha: 0.0 };
	var agent = new RL.DQNAgent(env, spec); 

	if(args.max && args.max.weights) {
		agent.fromJSON(args.max.weights);
	}

	var index = 0;

	Rx.Observable.from(data)
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
			var position;
			var action;
			var percentSuccess;
			var odds;
			var meetsCriterion;

			acc.candles.push(modifiedCandle);
			if(acc.candles.length > numStates) {
				acc.candles.shift();

				if(++index > lastTestIndex) {
					action = agent.act(_.flatten(acc.candles));
					position = action === 0
						? 'short'
						: action === 1
								? 'long'
								: 'hold';

					percentSuccess = args && args.max && args.max.percentSuccess
						? args.max.percentSuccess
						: 0.0;

					odds = args && args.max && args.max.odds
						? args.max.odds
						: 0.0;

					meetsCriterion = args && args.max && args.max.meetsCriterion
						? 'true'
						: 'false';

					stringify([[currency, position, percentSuccess, odds, meetsCriterion, configFile]], function(err, formattedRow) {
						process.stdout.write(formattedRow);
					});
				}
			}

			return acc
		}, {candles: []})
		.subscribeOnCompleted(function() {
			console.error(configFile, '-', 'done');
		});
}

report(require(filePath));
