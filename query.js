'use strict';

var _ = require('lodash');
var moment = require('moment');
var request = require('request');
var nconf = require('nconf');
nconf.argv();

var instrument = nconf.get('instrument') || 'eurusd';
var token = nconf.get('token') || process.env.OANDA_TOKEN;
var time = nconf.get('time');
if(time) {
	time = moment(time).utc().format();
}
var long = !!nconf.get('long');
var margin = parseFloat(nconf.get('margin')) || 1.0;

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

function fetchOrders(currencyPair, time, done) {
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
						sum.bid = sum.bid + (net * dist);
						total.bid = total.bid + Math.abs(net);
				} else {
					sum.ask = sum.ask + (net * dist);
					total.ask = total.ask + Math.abs(net);
				}
			}
		});

		var bid = rate - Math.abs(sum.bid / total.bid);
		var ask = rate + Math.abs(sum.ask / total.ask);
		var average = (bid + ask) / 2.0;
		var bullish = (sum.bid / (Math.abs(sum.bid) + Math.abs(sum.ask))) > 0.5;

		done({
			ask: ask,
			rate: rate,
			bid: bid,
			average: average,
			bullish: bullish
		});
	});
}

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
		var sum = { bid: 0.0, ask: 0.0 };
		var total = { bid: 0, ask: 0 };

		_.each(_.sortBy(data.positionBook.buckets, 'price'), function(pricePoint) {
			pricePoint = _.reduce(_.keys(pricePoint), function(acc, key) {
				acc[key] = parseFloat(pricePoint[key]);

				return acc;
			}, {});

			var d = Math.abs(pricePoint.price - rate);

			if(d/rate <= margin) {
				if(pricePoint.longCountPercent) {
					sum.ask = sum.ask + (pricePoint.longCountPercent * pricePoint.price);
					total.ask = total.ask + pricePoint.longCountPercent;
				}

				if(pricePoint.shortCountPercent) {
					//console.error(pricePoint);
					sum.bid = sum.bid + (pricePoint.shortCountPercent * pricePoint.price);
					total.bid = total.bid + pricePoint.shortCountPercent;
				}
			}
		});

		var bid = sum.bid / total.bid;
		var ask = sum.ask / total.ask;
		var average = (bid + ask) / 2.0;
		var bullish = average < rate;


		done({
			ask: ask,
			rate: rate,
			bid: bid,
			average: average,
			bullish: bullish
		});
	});
}

console.log('instrument:', instrument);

fetchOrders(instrument, time, function(orderResult) {
	console.log('orders:', orderResult);
	fetchOpenPositions(instrument, time, function(openPositionsResult) {
		console.log('open positions:', openPositionsResult);

		var bullish = openPositionsResult.bullish && orderResult.bullish
			? 'yes'
			: openPositionsResult.bullish || orderResult.bullish
				? 'neutral'
				: 'no'
		var el = long
			? (orderResult.bid + openPositionsResult.ask) / 2.0
			: (orderResult.ask + openPositionsResult.bid) / 2.0;

		console.log('summary:', {
			bullish: bullish,
			sl: long ? Math.min(openPositionsResult.bid, openPositionsResult.ask) : Math.max(openPositionsResult.bid, openPositionsResult.ask),
			el: el,
			tp: long ? orderResult.ask : orderResult.bid
		});
	});
});

