'use strict';

var _ = require('lodash');
var async = require('async');
var assert = require('assert');
var RL = require('./rl.js');
var Rx = require('rx');
var stringify = require('csv-stringify');
var fs = require('fs');

var nconf = require('nconf');
nconf.argv();

var utils = require('./utils.js');

var querySize = parseInt(nconf.get('query-size') || 1);

var agentsDir = process.env.DIR_AGENTS || './neurons';

function report(configFile, currency, data, args, done){
	var env = {};
	var numStates = args.numStates;
	var dataSize = data.length;
	var lastTestIndex = (dataSize - (numStates + querySize));
	env.getNumStates = function() { return numStates * 4; }
	env.getMaxNumActions = function() { return 3; }

	var spec = { gamma: args.gamma, epsilon: 0.0, alpha: 0.0 };
	var agent = new RL.DQNAgent(env, spec); 

	if(args.max && args.max.weights) {
		agent.fromJSON(args.max.weights);
	}

	var index = 0;

	Rx.Observable.from(data)
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
			setImmediate(done);
		});
}

var cache = {};

fs.readdir(agentsDir, function(err, files) {
	async.eachSeries(files, function(file, doneFile) {
		var filePath = agentsDir + '/' + file;
		var configJson = require(filePath);

		async.eachSeries([
			'EURUSD',
			'GBPUSD',
			'NZDUSD',
			'AUDUSD',
			'USDCHF',
			'USDCAD',
			'USDJPY',
			'EURGBP',
			'EURAUD',
			'EURNZD',
			'EURCAD',
			'EURCHF',
			'EURJPY',
			'GBPAUD',
			'GBPNZD',
			'GBPCAD',
			'GBPCHF',
			'GBPJPY',
			'AUDNZD',
			'AUDCAD',
			'AUDCHF',
			'AUDJPY',
			'NZDCAD',
			'NZDCHF',
			'NZDJPY',
			'CADCHF',
			'CADJPY',
			'CHFJPY'
		], function(currency, doneCurrency) {
			if(!cache[currency]) {
				utils.download({
					endDate: process.env.REPORT_DATE,
					currency: currency,
					periodLength: 18,
					periodUnits: 'months'
				}, function(err, data) {
					cache[currency] = data;
					report(file, currency, data, configJson, doneCurrency);
				});
			} else {
				report(file, currency, cache[currency], configJson, doneCurrency);
			}
		}, doneFile);
	}, function() {
		console.error('DONE');
	});
});
