'use strict'

// Proxies
const configProxy = require('./proxies/configProxy');
const logProxy = require('./proxies/logProxy');
const heartbeatProxy = require('./proxies/heartbeatProxy');

module.exports.configProxy = configProxy;
module.exports.logProxy = logProxy;
module.exports.heartbeatProxy = heartbeatProxy;

// Constants
const logConstants = require('./constants/log');
const generalConstants = require('./constants/general');

module.exports.logConstants = logConstants;
module.exports.generalConstants = generalConstants;
