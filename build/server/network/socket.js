(function() {
  var TandemAdapter, TandemSocket, async, socketio, _, _authenticate,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('lodash');

  async = require('async');

  socketio = require('socket.io');

  TandemAdapter = require('./adapter');

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
      _.each(TandemAdapter.routes, function(route, name) {
        return socket.removeAllListeners(route);
      });
      socket.on('disconnect', function() {
        return _this.leave(sessionId, fileId);
      });
      socket.join(fileId);
      return TandemSocket.__super__.join.apply(this, arguments);
    };

    TandemSocket.prototype.broadcast = function(sessionId, fileId, route, packet) {
      var socket;
      socket = this.sockets[sessionId];
      return socket.broadcast.to(fileId).emit(route, packet);
    };

    TandemSocket.prototype.checkOpen = function(fileId) {
      return this.io.sockets.clients(fileId).length > 0;
    };

    TandemSocket.prototype.listen = function(sessionId, route, callback) {
      var socket;
      socket = this.sockets[sessionId];
      socket.on(route, callback);
      return this;
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
