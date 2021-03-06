var _ = require('lodash');
var moment = require('moment');
var assert = require('assert');
var request = require('request');
var jsdom = require('jsdom');

module.exports = {
	download: download
}

function download(options, done) {
	var settings = _.defaultsDeep(options, {
		periodLength: 10,
		periodUnits: 'years',
		timeScale: '10080',
		endHour: '22',
		format: 'YYYY-MM-DD'
	})

	assert.ok(settings.currency);

	var now = settings.endDate
		? moment(settings.endDate, settings.format)
		: moment();
	var past = moment(now.toDate()).subtract(settings.periodLength, settings.periodUnits);

	var endHour = settings.endHour;
	var formattedNow = now.format(settings.format);
	var formattedPast = past.format(settings.format);

	var requestUrl = 'https://www.myfxbook.com/getHistoricalDataByDate.json?&start=' +
		formattedPast +
		'%20' +
		endHour +
		':00&end=' +
		formattedNow + 
		'%20' +
		endHour +
		':00&symbol=' +
		settings.currency +
		'&timeScale=' +
		settings.timeScale +
		'&userTimeFormat=0&z=' +
		Math.random();

	request(requestUrl, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			body = JSON.parse(body);
			jsdom.env(body.content.historyData, function(err, window) {
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

				done(null, rows.reverse())
			});
		}
	});
}
