(function() {
  var EventEmitter, TandemNetwork, async, socketio, _, _authenticate, _initNetwork,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore')._;

  async = require('async');

  socketio = require('socket.io');

  EventEmitter = require('events').EventEmitter;

  _authenticate = function(client, packet, callback) {
    var _this = this;
    return async.waterfall([
      function(callback) {
        return _this.storage.authorize(packet, callback);
      }, function(callback) {
        return _this.emit(TandemNetwork.events.CONNECT, client, packet.fileId, packet.userId, callback);
      }
    ], function(err) {
      if ((err != null) && _.isObject(err)) {
        err = err.message;
      }
      return callback({
        error: err
      });
    });
  };

  _initNetwork = function(server) {
    var _this = this;
    this.io = socketio.listen(server, this.settings);
    this.io.configure('production', function() {
      _this.io.enable('browser client minification');
      return _this.io.enable('browser client etag');
    });
    return this.io.sockets.on('connection', function(client) {
      return client.on('auth', function(packet, callback) {
        return _authenticate.call(_this, client, packet, callback);
      });
    });
  };

  TandemNetwork = (function(_super) {
    __extends(TandemNetwork, _super);

    TandemNetwork.DEFAULTS = {
      'browser client': false,
      'log level': 1,
      'transports': ['websocket', 'xhr-polling']
    };

    TandemNetwork.events = {
      CONNECT: 'network-connect',
      ERROR: 'network-error'
    };

    TandemNetwork.prototype.events = TandemNetwork.events;

    function TandemNetwork(tandemServer, httpServer, storage, options) {
      this.storage = storage;
      if (options == null) {
        options = {};
      }
      this.settings = _.defaults(_.pick(options, _.keys(TandemNetwork.DEFAULTS)), TandemNetwork.DEFAULTS);
      _initNetwork.call(this, httpServer);
    }

    return TandemNetwork;

  })(EventEmitter);

  module.exports = TandemNetwork;

}).call(this);
