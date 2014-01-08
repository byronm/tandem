Tandem         = require('tandem-core');
Tandem.Client  = require('./src/client/tandem');
Tandem.File    = require('./src/client/file');
Tandem.Network = {
  Adapter : require('./src/client/network/adapter'),
  Socket  : require('./src/client/network/socket')
};

module.exports = Tandem
