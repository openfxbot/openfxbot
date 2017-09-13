var parse = require('csv-parse');
var fs = require('fs');

// Create the parser
var parser = parse({
	auto_parse: true,
	columns: ['file', 'jobId', 'cycles', 'wealth', 'success', 'decisions']
});
// Use the writable stream api
parser.on('readable', function(){
  while(record = parser.read()){
		var decisions = JSON.parse(record.decisions);
		var filePath = './neurons/' + record.file + '.json';
		var args = require(filePath);
		args.max.odds = decisions.correct / decisions.wrong;
		var b = args.max.odds - 1.0;
		var p = args.max.percentSuccess;
		var q =  1.0 - p;
		args.max.meetsCriterion = (b > q / p);

		console.log('percentSuccess:', p, 'meetsCriterion:', args.max.meetsCriterion, 'odds:', args.max.odds);
		fs.writeFileSync(filePath, JSON.stringify(args));
  }
});

// Catch any error
parser.on('error', function(err){
  console.log(err.message);
});

parser.on('finish', function(){
	console.log('done');
});

// Now that setup is done, write data to the stream
var lineReader = require('readline').createInterface({
  input: require('fs').createReadStream('./results.csv')
});

var skipped = false;
lineReader.on('line', function (line) {
	if(skipped) {
		parser.write(line + '\n');
	}
	skipped = true;
});
// Close the readable stream
lineReader.on('close', function () {
	parser.end();
});
