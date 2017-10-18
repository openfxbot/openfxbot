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
		var sum = 0.0;
		var total = 0.0;

		_.each(_.reverse(_.sortBy(_.keys(data[timestamp].price_points))), function(pricePoint) {
			var net = (data[timestamp].price_points[pricePoint].ol - data[timestamp].price_points[pricePoint].os);
			var dist = Math.abs(pricePoint - rate);
			var margin = parseFloat(nconf.get('margin') || 1.0);

			if(dist < margin * rate) {
				sum = sum + (net * dist);
				total++;
			}
		});

		var average = sum / total + rate;
		console.log(new Date(timestamp * 1000), rate, average, rate > average ? 'BUY' : 'SELL');
	});
});
