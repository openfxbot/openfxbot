var nconf = require('nconf');
nconf.argv();

var request = require('request');
var requestUrl = 'https://api-fxpractice.oanda.com/labs/v1/orderbook_data?' +
	'instrument=' + nconf.get('instrument') + '&' +
	'period=' + nconf.get('period');

var _ = require('lodash');

var requestOpts = {
	url: requestUrl,
	headers: {
		'Authorization': 'Bearer ' + nconf.get('token')
	}
};

request(requestOpts, function(error, response, body) {
	var data = JSON.parse(body);

	_.each(_.sortBy(_.keys(data)), function(timestamp) {
		var rate = data[timestamp].rate;
		var sum = { bid: 0.0, ask: 0.0 };
		var total = { bid: 0, ask: 0 };
		var max = { os: 0.0, ask: 0.0 };
		var min = { ol: 0.0, bid: 0.0 };

		_.each(_.reverse(_.sortBy(_.keys(data[timestamp].price_points))), function(pricePoint) {
			var net = (data[timestamp].price_points[pricePoint].ol - data[timestamp].price_points[pricePoint].os);
			var dist = Math.abs(pricePoint - rate);
			var margin = parseFloat(nconf.get('margin') || 1.0);

			if(dist < margin * rate) {
				if(net > 0.0) {
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

		console.log(new Date(timestamp * 1000), rate, bid, ask, average, (sum.bid / (Math.abs(sum.bid) + Math.abs(sum.ask))) > 0.5 ? 'BUY:' + max.ask : 'SELL:' + min.bid);
	});
});
