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
	var meetsCriterion;
	var currency;
	var position;
  while(record = parser.read()){
	  currency = record[0];
	  position = record[1];
		chance = parseFloat(record[2]) || 0.0;
		odds = parseFloat(record[3]) || 0.0;
		meetsCriterion = record[4] === 'true';

		if(chance > 0.0 && odds > 0.0) {
			if(meetsCriterion) {
				results[currency][position]['chance'] = (results[currency][position]['chance'] || 0.0) + chance;
				results[currency][position]['odds'] = Math.max(results[currency][position]['odds'] || 0.0, odds);

				results[currency][position]['total'] = (results[currency][position]['total'] || 0) + 1.0;
			}
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
	var wager;
	var totalWager;
	var stopLoss;

	console.log('results:', JSON.stringify(results, null, '\t'));

	for(var i = 0; i< currencies.length; i++) {
		console.log('-------', currencies[i],'-------');

		for(var j=0; j < positions.length; j++) {
			currency = currencies[i];
			position = positions[j];

			if(results[currency][position]['total']) {
				chance = results[currency][position]['chance'] / results[currency][position]['total'];
				odds = results[currency][position]['odds'] - 1.0;

				if(odds > 0.0) {
					wager = chance - ((1.0 - chance) / odds);
					results[currency][position]['wager'] = wager;

					console.log(position, ':', (wager * 100.0) + '%');
				}
			}
		}

		totalWager = results[currency]['long']['wager'] - results[currency]['short']['wager'];
		stopLoss = 1.0 - ((totalWager * 100.0) / 1000.0);
		console.log(
			'action', ':',
			totalWager > 0.0 ? 'buy' : 'sell',
			(Math.abs(totalWager) * 100.0) + '%',
			stopLoss
		);
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
