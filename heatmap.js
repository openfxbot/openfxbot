var _ = require('lodash');
var utils = require('./utils.js');

console.log(1.0000000000000000, 'USD');

_.each([
	'EURUSD',
	'NZDUSD',
	'GBPUSD',
	'AUDUSD',
	'USDCAD',
	'USDJPY',
	'USDCHF'
], function(currency) {
	utils.download({
		currency: currency,
		timeScale: '1440',
		periodLength: 1,
		periodUnits: 'week'
	}, function(err, rows) {
		var closePrice = rows[0][3]
		var openPrice = rows[0][3]
		_.each(rows, function(row) {
			openPrice = row[3]
		});

		var invertPercentChange = [
			'USDJPY',
			'USDCHF',
			'USDCAD'
		];
		var percentChange = _.includes(invertPercentChange, currency)
			? (closePrice/openPrice)
			: (openPrice/closePrice);

		console.log(percentChange, currency.replace('USD', ''));
	});
})
