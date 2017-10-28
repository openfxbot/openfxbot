'use strict';

var _ = require('lodash');
var moment = require('moment');
var request = require('request');
var nconf = require('nconf');
nconf.argv();

var token = nconf.get('token') || process.env.OANDA_TOKEN;
var time = nconf.get('time');
if(time) {
	time = moment(time).utc().format();
}
var margin = parseFloat(nconf.get('margin')) || 1.0;
var target = parseFloat(nconf.get('target')) || 0.0075;

var data = nconf.get('csv') || './report.csv';

// Create the parser
var parser = require('csv-parse')();

var results = {};
var wagers = [];
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
	var multiplier;

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

		netWager =  results[currency]['long']['wager'] - results[currency]['short']['wager'];
		multiplier = netWager > 0.0 ? 1.0 : -1.0;

		pair = getPair(currency);

		rankBase[pair.base] = (rankBase[pair.base] || 0.0) + netWager;
		rankBase[pair.other] = (rankBase[pair.other] || 0.0) - netWager;
		rankTotal[pair.base]++;
		rankTotal[pair.other]++;

		// if(results[currency]['hold']['wager'] < results[currency][netWager > 0.0 ? 'long' : 'short']['wager'])
		wagers.push({currency: currency, wager: netWager});
	}

	var rankings = {};
	_.each(_.keys(rankBase), function(key) {
		rankings[key] = 100.0 * (rankBase[key] || 0.0) / rankTotal[key];
	});

	_.each(_.keys(results), function (currencyPair) {
		var newPair = getPair(currencyPair);

		var sum = rankings[newPair.base] - rankings[newPair.other];

		switch(currencyPair) {
			case 'eurusd':
			case 'gbpusd':
			case 'nzdusd':
			case 'audusd':
			case 'usdcad':
			case 'usdchf':
			case 'usdjpy':
				fetchResults(sum, target, currencyPair, time, margin, function(result) {
					console.log(
						sum,
						currencyPair,
						'bullish:'+(result.bullish ? 'yes' : 'no'),
						'risk:'+Math.abs(result.el - result.sl),
						'sl:'+result.sl, 'el:'+result.el, 'tp:'+result.tp
					);
				});
				break;
			case 'eurcad':
			case 'gbpcad':
			case 'nzdcad':
			case 'audcad':
			case 'nzdjpy':
			case 'nzdchf':
			case 'audchf':
			case 'audjpy':
			case 'eurchf':
			case 'eurjpy':
			case 'gbpchf':
			case 'gbpjpy':
				fetchResults(sum, target, newPair.base + 'usd', time, margin, function(baseResult) {
					fetchResults(sum, target, 'usd' + newPair.other, time, margin, function(otherResult) {
						var el = baseResult.el * otherResult.el;
						var sl = baseResult.sl * otherResult.sl;
						var tp = baseResult.tp * otherResult.tp;

						var bullish = baseResult.bullish && otherResult.bullish
							? 'yes'
							: !baseResult.bullish && !otherResult.bullish
								? 'no'
								: baseResult.bullish
									? sum > 0.0 ? newPair.base + 'usd(buy)' : 'usd' + newPair.other + '(sell)'
									: sum < 0.0 ? newPair.base + 'usd(sell)' : 'usd' + newPair.other + '(buy)';

						console.log(
							sum,
							currencyPair,
							'bullish:'+bullish,
							'risk:'+Math.abs(el - sl),
							'sl:'+sl, 'el:'+el, 'tp:'+tp
						);
					});
				});
				break;
			case 'euraud':
			case 'eurgbp':
			case 'eurnzd':
			case 'gbpaud':
			case 'gbpnzd':
			case 'audnzd':
				fetchResults(sum, target, newPair.base + 'usd', time, margin, function(baseResult) {
					fetchResults(-sum, target, newPair.other + 'usd', time, margin, function(otherResult) {
						var el = baseResult.el / otherResult.el;
						var sl = baseResult.sl / otherResult.sl;
						var tp = baseResult.tp / otherResult.tp;

						var bullish = baseResult.bullish && !otherResult.bullish
							? 'yes'
							: !baseResult.bullish && otherResult.bullish
								? 'no'
								: baseResult.bullish
									? sum > 0.0 ? newPair.base + 'usd(buy)' : newPair.other + 'usd(buy)'
									: sum < 0.0 ? newPair.base + 'usd(sell)' : newPair.other + 'usd(sell)';

						console.log(
							sum,
							currencyPair,
							'bullish:'+bullish,
							'risk:'+Math.abs(el - sl),
							'sl:'+sl, 'el:'+el, 'tp:'+tp
						);
					});
				});
				break;
			case 'chfjpy':
			case 'cadjpy':
			case 'cadchf':
				fetchResults(-sum, target, 'usd' + newPair.base, time, margin, function(baseResult) {
					fetchResults(sum, target, 'usd' + newPair.other, time, margin, function(otherResult) {
						var el = otherResult.el / baseResult.el;
						var sl = otherResult.sl / baseResult.sl;
						var tp = otherResult.tp / baseResult.tp;

						var bullish = !baseResult.bullish && otherResult.bullish
							? 'yes'
							: baseResult.bullish && !otherResult.bullish
								? 'no'
								: !baseResult.bullish
									? sum > 0.0 ? 'usd' + newPair.base + '(sell)' : 'usd' + newPair.other + '(sell)'
									: sum < 0.0 ? 'usd' + newPair.base + '(buy)' : 'usd' + newPair.other + '(buy)';

						console.log(
							sum,
							currencyPair,
							'bullish:'+bullish,
							'risk:'+Math.abs(el - sl),
							'sl:'+sl, 'el:'+el, 'tp:'+tp
						);
					});
				});
				break;
			default:
				console.log(sum, currencyPair);
		};
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

function fetchResults(bias, target, currencyPair, time, margin, done) {
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
		var sum = { bid: 0.0, ask: 0.0 };
		var total = { bid: 0, ask: 0 };
		var max = { os: 0.0, ask: 0.0 };
		var min = { ol: 0.0, bid: 0.0 };

		_.each(_.sortBy(data.orderBook.buckets, 'price'), function(pricePoint) {
			pricePoint = _.reduce(_.keys(pricePoint), function(acc, key) {
				acc[key] = parseFloat(pricePoint[key]);

				return acc;
			}, {});

			var net = (pricePoint.longCountPercent - pricePoint.shortCountPercent);
			var distOrig = pricePoint.price - rate;
			var dist = Math.abs(distOrig);

			if(dist < margin * rate) {
				if(distOrig < 0.0) {
					if(net > min.ol) {
						min.ol = net;
						min.bid = rate - dist;
					}
					sum.bid = sum.bid + (net * dist);
					total.bid++;
				} else {
					if(net < max.os) {
						max.os = net;
						max.ask = rate + dist;
					}
					sum.ask = sum.ask + (net * dist);
					total.ask++;
				}
			}
		});

		var bid = rate - Math.abs(sum.bid / total.bid);
		var ask = rate + Math.abs(sum.ask / total.ask);
		var average = (bid + ask) / 2.0;
		var bullish = (sum.bid / (Math.abs(sum.bid) + Math.abs(sum.ask))) > 0.5;

		var buyEntryLimit = ((bullish ? average : bid) + rate) / 2.0;
		var sellEntryLimit = ((!bullish ? average : ask) + rate) / 2.0;

		var result = bias > 0.0
			? { bullish: bullish, sl: bid, el: buyEntryLimit, tp: buyEntryLimit * (1.0 + target) }
			: { bullish: bullish, sl: ask, el: sellEntryLimit, tp: sellEntryLimit * (1.0 - target) };

		done(result);
	});
}
