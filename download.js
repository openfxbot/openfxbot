var moment = require('moment');

var format = 'YYYY-MM-DD'
var now = process.env.REPORT_DATE
	? moment(process.env.REPORT_DATE, format)
	: moment();
var past = moment(now.toDate()).subtract(10, 'years');

var formattedHour = now.format('HH');
var formattedNow = now.format(format);
var formattedPast = past.format(format);

var assert = require('assert');
var request = require('request');

var requestUrl = 'http://www.myfxbook.com/getHistoricalDataByDate.json?&start=' +
	formattedPast +
	'%2022:00&end=' +
	formattedNow + 
	'%2022:00&symbol=' +
	(process.env.CURRENCY || 'EURUSD') +
	'&timeScale=10080&userTimeFormat=0';

request(requestUrl, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			body = JSON.parse(body);
			require('jsdom').env(body.content.historyData, function(err, window) {
				var $ = require('jquery')(window);

				var tableRows = $('table#symbolMarket tr');
				var rowIndex = 0;
				var rows = [];
				tableRows.each(function(){
					var tableData = $(this).find('td');
					var row = [];
					tableData.each(function(){
						row.push(parseFloat($(this).text()));
						if(row.length === tableData.length) {
							rows.push([row[1], row[2], row[3], row[4]]);
						}
					});
				});

				console.log('module.exports', '=', JSON.stringify(rows.reverse()));
			});
		}
});
