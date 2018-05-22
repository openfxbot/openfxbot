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
		endDate: process.env.REPORT_DATE,
		endHour: process.env.REPORT_HOUR || '21',
		currency: currency,
		timeScale: '60',
		periodLength: 1,
		periodUnits: 'week'
	}, function(err, rows) {
		var closePrice = rows[0][3]
		var openPrice = rows[0][1]
		_.each(rows, function(row) {
			closePrice = row[3]
		});

		var invertPercentChange = [
			'USDJPY',
			'USDCHF',
			'USDCAD'
		];
		var percentChange = _.includes(invertPercentChange, currency)
			? (openPrice/closePrice)
			: (closePrice/openPrice);

		console.log(percentChange, currency.replace('USD', ''));
	});
})
