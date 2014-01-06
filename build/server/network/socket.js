(function() {
  var EventEmitter, TandemAdapter, TandemEmitter, TandemFile, TandemSocket, async, socketio, _, _authenticate,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore')._;

  async = require('async');

  socketio = require('socket.io');

  EventEmitter = require('events').EventEmitter;

  TandemAdapter = require('./adapter');

  TandemEmitter = require('../emitter');

  TandemFile = require('../file');

  _authenticate = function(client, packet, callback) {
    var _this = this;
    return async.waterfall([
      function(callback) {
        return _this.fileManager.authorize(packet, callback);
      }, function(callback) {
        return _this.emit(TandemAdapter.events.CONNECT, client.id, packet.fileId, packet.userId, callback);
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

    TandemSocket.prototype.addClient = function(sessionId, userId, file) {
      var socket, _base,
        _this = this;
      this.broadcast(sessionId, TandemFile.routes.JOIN, userId);
      if ((_base = file.users)[userId] == null) {
        _base[userId] = 0;
      }
      file.users[userId] += 1;
      socket = this.sockets[sessionId];
      _.each(TandemFile.routes, function(route, name) {
        return socket.removeAllListeners(route);
      });
      socket.on('disconnect', function() {
        return _this.removeClient(sessionId, userId, file);
      });
      return TandemSocket.__super__.addClient.apply(this, arguments);
    };

    TandemSocket.prototype.removeClient = function(sessionId, userId, file) {
      if (userId != null) {
        this.broadcast(sessionId, TandemFile.routes.LEAVE, userId);
      }
      this.leave(sessionId, file.id);
      if (file.users[userId] != null) {
        return file.users[userId] -= 1;
      }
    };

    TandemSocket.prototype.broadcast = function(sessionId, fileId, route, packet) {
      var socket;
      socket = this.sockets[sessionId];
      return socket.broadcast.to(fileId).emit(route, packet);
    };

    TandemSocket.prototype.join = function(sessionId, fileId) {
      var socket;
      socket = this.sockets[sessionId];
      return socket.join(fileId);
    };

    TandemSocket.prototype.leave = function(sessionId, fileId) {
      var socket;
      socket = this.sockets[sessionId];
      return socket.leave(fileId);
    };

    TandemSocket.prototype.listen = function(sessionId, route, callback) {
      var socket;
      socket = this.sockets[sessionId];
      socket.on(route, callback);
      return this;
    };

    return TandemSocket;

  })(TandemAdapter);

  module.exports = TandemSocket;

}).call(this);
