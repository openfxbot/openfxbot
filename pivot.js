var _ = require('lodash');
var assert = require('assert');

var utils = require('./utils.js');

assert.ok(process.env.CURRENCY, 'CURRENCY was not provided');

utils.download({
	endDate: process.env.REPORT_DATE,
	currency: process.env.CURRENCY,
	timeScale: '1440',
	periodLength: 1,
	periodUnits: 'day'
}, function(err, rows) {
	_.each(rows, function(ohlc) {
		var PP = (ohlc[1] +  ohlc[2] + ohlc[3]) / 3.0;
		var R1 = 2.0 * PP - ohlc[2];
		var S1 = 2.0 * PP - ohlc[1];
		var R3 = ohlc[1] + 2.0 * (PP - ohlc[2]);
		var S3 = ohlc[2] - 2.0 * (ohlc[1] - PP);

		console.log('R3:', R3);
		console.log('R1:', R1);
		console.log('PP:', PP);
		console.log('S1:', S1);
		console.log('S3:', S3);
	});
});
