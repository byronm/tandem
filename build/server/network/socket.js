(function() {
  var EventEmitter, TandemAdapter, TandemSocket, async, socketio, _, _authenticate,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore')._;

  async = require('async');

  socketio = require('socket.io');

  EventEmitter = require('events').EventEmitter;

  TandemAdapter = require('./adapter');

  _authenticate = function(client, packet, callback) {
    var _this = this;
    return async.waterfall([
      function(callback) {
        return _this.fileManager.authorize(packet, callback);
      }, function(callback) {
        return _this.emit(TandemAdapter.events.CONNECT, client, packet.fileId, packet.userId, callback);
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

  TandemSocket = (function(_super) {
    __extends(TandemSocket, _super);

    TandemSocket.DEFAULTS = {
      'browser client': false,
      'log level': 1,
      'transports': ['websocket', 'xhr-polling']
    };

    function TandemSocket(httpServer, fileManager, options) {
      var _this = this;
      this.fileManager = fileManager;
      if (options == null) {
        options = {};
      }
      this.settings = _.defaults(_.pick(options, _.keys(TandemSocket.DEFAULTS)), TandemSocket.DEFAULTS);
      this.io = socketio.listen(httpServer, this.settings);
      this.io.configure('production', function() {
        _this.io.enable('browser client minification');
        return _this.io.enable('browser client etag');
      });
      this.io.sockets.on('connection', function(client) {
        return client.on('auth', function(packet, callback) {
          return _authenticate.call(_this, client, packet, callback);
        });
      });
    }

    TandemSocket.prototype.broadcast = function(fileId, route, packet) {};

    TandemSocket.prototype.send = function(route, packet) {};

    return TandemSocket;

  })(TandemAdapter);

  module.exports = TandemSocket;

}).call(this);
