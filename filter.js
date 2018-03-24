'use strict';

var _ = require('lodash');
var moment = require('moment');
var nconf = require('nconf');
nconf.argv();

var data = nconf.get('csv') || './scores.csv';

// Create the parser
var parser = require('csv-parse')();

var scores = {};
var lastUpdatedDates = {};
var sum = 0.0;
var count = 0;
var cutoffDate = moment().subtract(1, 'months');

// Use the writable stream api
parser.on('readable', function(){
	var record;
	var score;
	var filename;
  while(record = parser.read()){
	  score = parseFloat(record[0]);
	  filename = record[1];

		if(!_.isNaN(score) && score > 0.0) {
			sum = sum + score;
			count++;

			scores[filename] = score;
		} else {
			console.log(filename);
		}
		lastUpdatedDates[filename] = record[2];
  }
});
// Catch any error
parser.on('error', function(err){
  console.error(err.message);
});

parser.on('finish', function(){
	var average = sum / count;

	_.each(_.keys(scores), function(filename) {
		var lastUpdatedDate = lastUpdatedDates[filename];
		//var isNotValid = scores[filename] < average ||
		var isNotValid = !lastUpdatedDate ||
			moment(lastUpdatedDate).isBefore(cutoffDate);

		if(isNotValid) {
			console.log(filename);
		}
	});
});

var lineReader = require('readline').createInterface({
  input: require('fs').createReadStream(data)
});

var lineCount = 0;
lineReader.on('line', function (line) {
	if(lineCount) {
		parser.write(line + '\n');
	}

	lineCount++;
});

lineReader.on('close', function() {
	parser.end();
});
