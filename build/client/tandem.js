(function() {
  var TandemAdapter, TandemClient, TandemFile, _;

  _ = require('lodash');

  TandemFile = require('./file');

  TandemAdapter = require('./network/adapter');

  TandemClient = (function() {
    TandemClient.DEFAULTS = {
      userId: null,
      network: TandemAdapter
    };

    function TandemClient(endpointUrl, options) {
      this.endpointUrl = endpointUrl;
      this.options = options != null ? options : {};
      options = _.pick(this.options, _.keys(TandemClient.DEFAULTS));
      this.settings = _.extend({}, TandemClient.DEFAULTS, options);
      if (this.settings.userId == null) {
        this.settings.userId = 'anonymous-' + _.random(1000000);
      }
    }

    TandemClient.prototype.open = function(fileId, authObj, initial, callback) {
      this.adapter = _.isFunction(this.settings.network) ? new this.settings.network(this.endpointUrl, fileId, this.settings.userId, authObj, this.options) : this.settings.network;
      return new TandemFile(fileId, this.adapter, initial, callback);
    };

    return TandemClient;

  })();

  module.exports = TandemClient;

}).call(this);
