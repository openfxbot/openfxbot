var nconf = require('nconf');
nconf.argv();

var _ = require('lodash');
var request = require('request');

function fetchResults(instrument, margin, done) {
	var requestUrl = 'https://api-fxpractice.oanda.com/v3/instruments/' + instrument + '/orderBook';

	var requestOpts = {
		url: requestUrl,
		gzip: true,
		headers: {
			'Authorization': 'Bearer ' + nconf.get('token')
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

		done(null, {
			rate: rate,
			max: max.ask,
			ask: ask,
			bid: bid,
			min: min.bid,
			average: average,
			bullish: bullish
		});
	});
}

function main() {
	var instrument = nconf.get('instrument');
	var margin = parseFloat(nconf.get('margin')) || 1.0;

	switch(instrument) {
		default:
			fetchResults(instrument, margin, function handleResults(err, latest) {
				console.log('==========');
				console.log();
				console.log('DATE', '-', new Date());
				console.log('SELL - ' + JSON.stringify({ sl: latest.max, limit: latest.ask, tp: latest.bid, min: latest.min }));
				console.log('BUY - ' + JSON.stringify({ sl: latest.min, limit: latest.bid, tp: latest.ask, max: latest.max }));
				console.log('----------');
				console.log(latest.bullish ? 'UP' : 'DOWN', '-', 'avg:' + latest.average, latest.bullish ? '<' : '>', 'rate:' + latest.rate);
				console.log();
			});
	}
}

main();
