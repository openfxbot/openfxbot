'use strict';

var nconf = require('nconf');
nconf.argv();


var assert = require('assert');
var configFile = nconf.get('config-file');
assert.ok(configFile, '`--config-file` was not provided')

var agentsDir = process.env.DIR_AGENTS;
assert.ok(agentsDir, '`DIR_AGENTS` was not provided');

var filePath = agentsDir + '/' + configFile;

var _ = require('lodash');
var config = require(filePath);
var lastUpdatedDate = _.get(config, 'max.lastUpdatedDate');

var moment = require('moment');
var twoWeeksAgo = moment().subtract(1, 'weeks');
var isNotValid = !lastUpdatedDate ||
	moment(lastUpdatedDate).isBefore(twoWeeksAgo);

if(isNotValid) {
	console.log(filePath);
}
