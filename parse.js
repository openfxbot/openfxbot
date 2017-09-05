'use strict';

var nconf = require('nconf');
nconf.argv();

var data = nconf.get('csv') || './report.csv';

// Create the parser
var parser = require('csv-parse')();

var results = {
	eurusd: {
		hold: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		},
		long: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		},
		short: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		}
	},
	usdchf: {
		hold: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		},
		long: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		},
		short: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		}
	},
	usdjpy: {
		hold: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		},
		long: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		},
		short: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		}
	},
	gbpusd: {
		hold: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		},
		long: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		},
		short: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		}
	},
	audusd: {
		hold: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		},
		long: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		},
		short: {
			chance: 0.0,
			odds: 0.0,
			total: 0
		}
	}
};

// Use the writable stream api
parser.on('readable', function(){
	var cursor;
	var record;
	var chance;
	var odds;
  while(record = parser.read()){
		chance = parseFloat(record[2]) || 0.0;
		odds = parseFloat(record[3]) || 0.0;

		if(chance > 0.0 && odds > 0.0) {
			results[record[0]][record[1]]['chance'] = (results[record[0]][record[1]]['chance'] || 0.0) + chance;
			results[record[0]][record[1]]['odds'] = Math.max(results[record[0]][record[1]]['odds'] || 0.0, odds);
		
			results[record[0]][record[1]]['total'] = (results[record[0]][record[1]]['total'] || 0) + 1.0;
		}
  }
});
// Catch any error
parser.on('error', function(err){
  console.log(err.message);
});
// When we are done, test that the parsed output matched what expected
parser.on('finish', function(){
	var currencies = ['eurusd', 'usdchf', 'usdjpy','gbpusd', 'audusd'];
	var positions = ['hold', 'long', 'short'];
	var currency, position;
	var chance = 0.0;
	var odds = 0.0;

	console.log('results:', JSON.stringify(results, null, '\t'));

	for(var i = 0; i< currencies.length; i++) {
		console.log('-------', currencies[i],'-------');

		for(var j=0; j < positions.length; j++) {
			currency = currencies[i];
			position = positions[j];

			if(results[currency][position]['total']) {
				chance = results[currency][position]['chance'] / results[currency][position]['total'];
				odds = results[currency][position]['odds'];

				console.log(position, ':', (chance * 100.0) + '%', (odds - 1.0) + ':1');
			}
		}
	}
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
})
