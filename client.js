GLOBAL._ = require('underscore')._;
GLOBAL.EventEmitter2 = require('events').EventEmitter;
GLOBAL.async = require('async');
GLOBAL.io = require('socket.io-client');

url = require('url')

var Tandem = require('tandem-core');
Tandem.Client = require('./src/client/tandem');
Tandem.Engine = require('./src/client/engine');
Tandem.File   = require('./src/client/file');
Tandem.NetworkAdapter = require('./src/client/network');
Tandem.NetworkAdapter.parseUrl = function(inputUrl) {
  return url.parse(inputUrl);
};

module.exports = Tandem;
