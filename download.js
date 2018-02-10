var utils = require('./utils.js');

utils.download({
	currency: process.env.CURRENCY,
}, function(err, rows) {
	console.log('module.exports', '=', JSON.stringify(rows.reverse()));
});
