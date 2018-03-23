'use strict';

var nconf = require('nconf');
nconf.argv();

var assert = require('assert');
var configFile = nconf.get('config-file');
assert.ok(configFile, '`--config-file` was not provided')

var agentsDir = process.env.DIR_AGENTS;
assert.ok(agentsDir, '`DIR_AGENTS` was not provided');

var filePath = agentsDir + '/' + configFile;

var config = require(filePath);

var chance = config.max.percentSuccess;
var odds = config.max.odds;
var wager = chance - ((1.0 - chance) / odds);

var lastUpdatedDate = config.max.lastUpdatedDate;

console.log(wager + ',' + filePath + ',' + lastUpdatedDate);
