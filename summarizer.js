'use strict';

var _ = require('lodash');
var moment = require('moment');
var request = require('request');
var nconf = require('nconf');
nconf.argv();

var token = nconf.get('token') || process.env.OANDA_TOKEN;
var time = nconf.get('time')
	? nconf.get('time') + 'T22:00:00Z'
	: '';
if(time && moment().isAfter(moment(time))) {
	time = moment(time).utc().format();
} else {
	time = '';
}
var margin = parseFloat(nconf.get('margin')) || 0.005;
var target = parseFloat(nconf.get('target')) || 0.002;
var ranked = nconf.get('ranked') !== 'false';

var data = nconf.get('csv') || './report.csv';

// Create the parser
var parser = require('csv-parse')();

var results = {};
var wagers = {};
var rankBase = {};
var rankTotal = {usd:0, gbp:0, aud:0, eur:0, nzd:0, chf:0, cad:0, jpy:0};

// Use the writable stream api
parser.on('readable', function(){
	var cursor;
	var record;
	var chance;
	var odds;
	var meetsCriterion;
	var currency;
	var position;

  while(record = parser.read()){
	  currency = record[0].toLowerCase();
	  position = record[1];
		chance = parseFloat(record[2]) || 0.0;
		odds = parseFloat(record[3]) || 0.0;
		meetsCriterion = record[4] === 'true';

		if(!results[currency]) {
			results[currency] = {
				hold: {
					wager: 0.0,
					total: 0
				},
				long: {
					wager: 0.0,
					total: 0
				},
				short: {
					wager: 0.0,
					total: 0
				}
			};
		}

		if(chance > 0.0 && odds > 0.0) {
			if(meetsCriterion) {
				results[currency][position]['chance'] = (results[currency][position]['chance'] || 0.0) + chance;
				results[currency][position]['odds'] = (results[currency][position]['odds'] || 0.0) + odds;

				results[currency][position]['total'] = (results[currency][position]['total'] || 0) + 1.0;
			}
		}
  }
});
// Catch any error
parser.on('error', function(err){
  console.error(err.message);
});
// When we are done, test that the parsed output matched what expected
parser.on('finish', function(){
	var currencies = _.keys(results);
	var positions = ['hold', 'long', 'short'];
	var currency, position;
	var chance = 0.0;
	var odds = 0.0;
	var wager;
	var netWager;
	var total;
	var pair;

	// console.error('results:', JSON.stringify(results, null, '\t'));

	for(var i = 0; i< currencies.length; i++) {
		currency = currencies[i];
		// console.error('-------', currency,'-------');

		total = 0.0;
		for(var j=0; j < positions.length; j++) {
			position = positions[j];
			odds = 0.0;

			if(results[currency][position]['total']) {
				chance = results[currency][position]['chance'] / results[currency][position]['total'];
				odds = (results[currency][position]['odds'] / results[currency][position]['total']) - 1.0;
			}

			if(odds > 0.0) {
				wager = chance - ((1.0 - chance) / odds);
				results[currency][position]['wager'] = wager;

				// console.error(position, ':', (wager * 100.0) + '%');
			} else {
				results[currency][position]['wager'] = 0.0;
			}

			total = total + results[currency][position]['wager'];
		}

		netWager = results[currency]['long']['wager'] - results[currency]['short']['wager'];

		pair = getPair(currency);

		rankBase[pair.base] = (rankBase[pair.base] || 0.0) + (results[currency]['long']['wager'] / total);
		rankBase[pair.other] = (rankBase[pair.other] || 0.0) + (results[currency]['short']['wager'] /total);
		rankTotal[pair.base]++;
		rankTotal[pair.other]++;

		// if(results[currency]['hold']['wager'] < results[currency][netWager > 0.0 ? 'long' : 'short']['wager'])
		//wagers.push({currency: currency, wager: netWager});
		wagers[currency] = netWager;
	}

	var rankings = {};
	_.each(_.keys(rankBase), function(key) {
		rankings[key] = 100.0 * (rankBase[key] || 0.0) / rankTotal[key];
	});

	_.each(_.keys(rankBase), function (currencyKey) {
			console.log(rankings[currencyKey], currencyKey)
	});
});

var lineReader = require('readline').createInterface({
  input: require('fs').createReadStream(data)
});

var lineCount = 0;
lineReader.on('line', function (line) {
	if(lineCount) {
		parser.write(line + '\n');
	}

	lineCount++;
});

lineReader.on('close', function() {
	parser.end();
})

function getPair(currency) {
	var base = currency.substring(0, 3);
	var other = currency.substring(3, 6);

	var pair = {
		base: base,
		other: other
	};

	return pair;
}

var currencyPairMapping = {
	audjpy: 'AUD_JPY',
	audusd: 'AUD_USD',
	euraud: 'EUR_AUD',
	eurchf: 'EUR_CHF',
	eurgbp: 'EUR_GBP',
	eurjpy: 'EUR_JPY',
	eurusd: 'EUR_USD',
	gbpchf: 'GBP_CHF',
	gbpjpy: 'GBP_JPY',
	gbpusd: 'GBP_USD',
	nzdusd: 'NZD_USD',
	usdcad: 'USD_CAD',
	usdchf: 'USD_CHF',
	usdjpy: 'USD_JPY'
};

/*
function fetchStopOrders(currencyPair, time, entryLimit, done) {
	var instrument = currencyPairMapping[currencyPair];
	var requestUrl = 'https://api-fxpractice.oanda.com/v3/instruments/' + instrument + '/orderBook';

	if(time) {
		requestUrl = requestUrl + '?time=' + time;
	}

	var requestOpts = {
		url: requestUrl,
		gzip: true,
		headers: {
			'Authorization': 'Bearer ' + token
		}
	};

	var results = {};

	request(requestOpts, function(error, response, body) {
		var data = JSON.parse(body);
		if(error || _.has(data, 'errorMessage')) {
			return console.error('error:', error || data.errorMessage, requestUrl);
		}

		var rate = parseFloat(data.orderBook.price);
		var bid = entryLimit;
		var ask = entryLimit;
		var max = { bidPercent: 0.0, askPercent: 0.0 };

		_.each(_.sortBy(data.orderBook.buckets, 'price'), function(pricePoint) {
			pricePoint = _.reduce(_.keys(pricePoint), function(acc, key) {
				acc[key] = parseFloat(pricePoint[key]);

				return acc;
			}, {});

			var distOrig = pricePoint.price - entryLimit;
			var dist = Math.abs(distOrig);
			var net = pricePoint.price > rate
				? pricePoint.shortCountPercent - pricePoint.longCountPercent
				: pricePoint.longCountPercent - pricePoint.shortCountPercent;

			if(dist < target * entryLimit && (pricePoint.price < entryLimit || pricePoint.price > entryLimit)) {
				if(distOrig < 0.0) {
					if(net > max.bidPercent) {
						max.bidPercent = net;
						bid = pricePoint.price;
					}
				} else {
					if(net > max.askPercent) {
						max.askPercent = net;
						ask = pricePoint.price;
					}
				}
			}
		});

		var average = (bid + ask) / 2.0;

		done({
			instrument: instrument,
			ask: _.isNaN(ask) ? 0.0 : ask,
			rate: rate,
			bid: _.isNaN(bid) ? 0.0 : bid,
			average: average
		});
	});
}
*/

function fetchOpenPositions(currencyPair, time, done) {
	var instrument = currencyPairMapping[currencyPair];
	var requestUrl = 'https://api-fxpractice.oanda.com/v3/instruments/' + instrument + '/positionBook';

	if(time) {
		requestUrl = requestUrl + '?time=' + time;
	}

	var requestOpts = {
		url: requestUrl,
		gzip: true,
		headers: {
			'Authorization': 'Bearer ' + token
		}
	};

	var results = {};

	request(requestOpts, function(error, response, body) {
		var data = JSON.parse(body);
		if(error || _.has(data, 'errorMessage')) {
			return console.error('error:', error || data.errorMessage, requestUrl);
		}

		var rate = parseFloat(data.positionBook.price);
		var levels = {
			ask: [],
			bid: []
		};
		var max = { bidPercent: 0.0, askPercent: 0.0 };

		var ask = rate;
		var bid = rate;

		_.each(_.reverse(_.sortBy(data.positionBook.buckets, 'price')), function(pricePoint) {
			pricePoint = _.reduce(_.keys(pricePoint), function(acc, key) {
				acc[key] = parseFloat(pricePoint[key]);

				return acc;
			}, {});

			if(pricePoint.shortCountPercent > max.askPercent) {
				max.askPercent = pricePoint.shortCountPercent;
				ask = pricePoint.price
			} else if(max.askPercent > 0.0) {
				max.askPercent = 0.0;
				levels.ask.push(ask);
			}
		});

		_.each(_.sortBy(data.positionBook.buckets, 'price'), function(pricePoint) {
			pricePoint = _.reduce(_.keys(pricePoint), function(acc, key) {
				acc[key] = parseFloat(pricePoint[key]);

				return acc;
			}, {});

			if(pricePoint.longCountPercent > max.bidPercent) {
				max.bidPercent = pricePoint.longCountPercent;
				bid = pricePoint.price
			} else if(max.bidPercent > 0.0) {
				max.bidPercent = 0.0;
				levels.bid.push(bid);
			}
		});

		levels.bid = _.uniqBy(levels.bid.sort());
		levels.ask = _.uniqBy(levels.ask.sort());

		done({
			instrument: instrument,
			rate: rate,
			levels: levels
		});
	});
}
