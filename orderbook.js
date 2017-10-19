var nconf = require('nconf');
nconf.argv();

var _ = require('lodash');
var request = require('request');

function fetchResults(instrument, period, margin, done) {
	var requestUrl = 'https://api-fxpractice.oanda.com/labs/v1/orderbook_data?' +
		'instrument=' + instrument + '&' +
		'period=' + period;

	var requestOpts = {
		url: requestUrl,
		headers: {
			'Authorization': 'Bearer ' + nconf.get('token')
		}
	};

	var results = {};

	request(requestOpts, function(error, response, body) {
		var data = JSON.parse(body);

		_.each(_.reverse(_.sortBy(_.keys(data))), function(timestamp) {
			var rate = data[timestamp].rate;
			var sum = { bid: 0.0, ask: 0.0 };
			var total = { bid: 0, ask: 0 };
			var max = { os: 0.0, ask: 0.0 };
			var min = { ol: 0.0, bid: 0.0 };

			_.each(_.sortBy(_.keys(data[timestamp].price_points)), function(pricePoint) {
				var net = (data[timestamp].price_points[pricePoint].ol - data[timestamp].price_points[pricePoint].os);
				var distOrig = pricePoint - rate;
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

			results[timestamp] = {
				rate: rate,
				max: max.ask,
				ask: ask,
				bid: bid,
				min: min.bid,
				average: average,
				bullish: bullish
			};
		});

		done(null, results);
	});
}

function main() {
	var instrument = nconf.get('instrument');
	var period;
	var margin = parseFloat(nconf.get('margin')) || 1.0;

	switch(nconf.get('period')) {
		case 'year':
			period = 31536000;
			break;
		case 'month':
			period = 2592000;
			break;
		case 'week':
			period = 604800;
			break;
		case 'day':
			period = 86400;
			break;
		default:
			period = 3600;
			break
	}

	switch(instrument) {
		default:
			fetchResults(instrument, period, margin, function handleResults(err, results) {
				_.each(_.keys(results), function (timestamp) {
					var latest = results[timestamp];

					console.log('==========');
					console.log('DATE', '-', new Date(timestamp * 1000));
					console.log('SELL - ' + JSON.stringify({ sl: latest.max, limit: latest.ask, tp: latest.bid, min: latest.min }));
					console.log('BUY - ' + JSON.stringify({ sl: latest.min, limit: latest.bid, tp: latest.ask, max: latest.max }));
					console.log('----------');
					console.log(latest.bullish ? 'UP' : 'DOWN', '-', 'avg:' + latest.average, latest.bullish ? '<' : '>', 'rate:' + latest.rate);
					console.log();
				});
			});
	}
}

main();
