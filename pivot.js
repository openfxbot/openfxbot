var _ = require('lodash');
var assert = require('assert');

var utils = require('./utils.js');

assert.ok(process.env.CURRENCY, 'CURRENCY was not provided');

utils.download({
	endDate: process.env.REPORT_DATE,
	endHour: process.env.REPORT_HOUR || '21',
	currency: process.env.CURRENCY,
	timeScale: '60',
	periodLength: 1,
	periodUnits: 'day'
}, function(err, rows) {
	var ohlc = [
		rows[0][0],
		rows[0][1],
		rows[0][2],
		rows[0][3]
	];
	_.each(rows, function(row) {
		if(row[1] > ohlc[1]) {
			ohlc[1] = row[1];
		}
		if(row[2] < ohlc[2]) {
			ohlc[2] = row[2];
		}
		ohlc[3] = row[3];
	});

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
