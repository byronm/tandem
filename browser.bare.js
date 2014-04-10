Tandem         = require('tandem-core');
Tandem.Client  = require('./build/client/tandem');
Tandem.File    = require('./build/client/file');
Tandem.Network = {
  Adapter: require('./build/client/network/adapter')
};

module.exports = Tandem
