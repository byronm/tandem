(function() {
  var TandemAdapter, TandemEmitter, TandemSocket, async, socketio, _, _authenticate,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('lodash');

  async = require('async');

  socketio = require('socket.io');

  TandemAdapter = require('./adapter');

  TandemEmitter = require('../emitter');

  _authenticate = function(socket, packet, callback) {
    var _this = this;
    return this.storage.authorize(packet, function(err) {
      if (err != null) {
        if (_.isObject(err)) {
          err = err.message;
        }
      } else {
        _this.join(socket.id, packet.fileId);
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

    function TandemSocket(httpServer, fileManager, storage, options) {
      var _this = this;
      this.fileManager = fileManager;
      this.storage = storage;
      if (options == null) {
        options = {};
      }
      this.settings = _.defaults(_.pick(options, _.keys(TandemSocket.DEFAULTS)), TandemSocket.DEFAULTS);
      this.sockets = {};
      this.io = socketio.listen(httpServer, this.settings);
      this.io.configure('production', function() {
        _this.io.enable('browser client minification');
        return _this.io.enable('browser client etag');
      });
      this.io.sockets.on('connection', function(socket) {
        _this.sockets[socket.id] = socket;
        return socket.on('auth', function(packet, callback) {
          return _authenticate.call(_this, socket, packet, callback);
        });
      });
    }

    TandemSocket.prototype.join = function(sessionId, fileId) {
      var socket,
        _this = this;
      socket = this.sockets[sessionId];
      socket.on('disconnect', this.leave.bind(this, sessionId, fileId));
      _.each(TandemAdapter.routes, function(route, name) {
        socket.removeAllListeners(route);
        return socket.on(route, function(packet, callback) {
          return _this.handle(route, fileId, packet, function(err, callbackPacket, broadcastPacket) {
            if (err != null) {
              TandemEmitter.emit(TandemEmitter.events.ERROR, err);
            }
            callback(callbackPacket);
            if (broadcastPacket != null) {
              return socket.broadcast.to(fileId).emit(route, broadcastPacket);
            }
          });
        });
      });
      return socket.join(fileId);
    };

    TandemSocket.prototype.leave = function(sessionId, fileId) {
      var socket;
      socket = this.sockets[sessionId];
      if (socket != null) {
        socket.leave(fileId);
      }
      return delete this.sockets[sessionId];
    };

    return TandemSocket;

  })(TandemAdapter);

  module.exports = TandemSocket;

}).call(this);
