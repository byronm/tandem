(function() {
  var EventEmitter, Tandem, TandemAdapter, TandemEmitter, TandemFile, TandemSocket, async, initSocketListeners, resync, socketio, _, _authenticate,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore')._;

  async = require('async');

  socketio = require('socket.io');

  EventEmitter = require('events').EventEmitter;

  Tandem = require('tandem-core');

  TandemAdapter = require('./adapter');

  TandemEmitter = require('../emitter');

  TandemFile = require('../file');

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

  initSocketListeners = function(file, socket, userId) {
    var _this = this;
    _.each(TandemFile.routes, function(route, name) {
      return socket.removeAllListeners(route);
    });
    return socket.on(TandemFile.routes.RESYNC, function(packet, callback) {
      return resync.call(_this, file, callback);
    }).on(TandemFile.routes.SYNC, function(packet, callback) {
      return file.sync(parseInt(packet.version), function(err, delta, version) {
        if (err != null) {
          err.fileId = file.id;
          err.userId = userId;
          TandemEmitter.emit(TandemEmitter.events.ERROR, err);
          return resync.call(_this, file, callback);
        } else {
          socket.join(file.id);
          return callback({
            delta: delta,
            users: file.users,
            version: version
          });
        }
      });
    }).on(TandemFile.routes.UPDATE, function(packet, callback) {
      return file.update(Tandem.Delta.makeDelta(packet.delta), parseInt(packet.version), function(err, delta, version) {
        var broadcastPacket;
        if (err != null) {
          err.fileId = file.id;
          err.userId = userId;
          TandemEmitter.emit(TandemEmitter.events.ERROR, err);
          return resync.call(_this, file, callback);
        } else {
          broadcastPacket = {
            delta: delta,
            fileId: file.id,
            version: version
          };
          broadcastPacket['userId'] = userId;
          socket.broadcast.to(file.id).emit(TandemFile.routes.UPDATE, broadcastPacket);
          file.lastUpdated = Date.now();
          return callback({
            fileId: file.id,
            version: version
          });
        }
      });
    }).on(TandemFile.routes.BROADCAST, function(packet, callback) {
      packet['userId'] = userId;
      socket.broadcast.to(_this.id).emit(TandemFile.routes.BROADCAST, packet);
      if (callback != null) {
        return callback({});
      }
    }).on('disconnect', function() {
      return _this.removeClient(file, socket, userId);
    });
  };

  resync = function(file, callback) {
    return callback({
      resync: true,
      head: file.getHead(),
      version: file.getVersion(),
      users: file.users
    });
  };

  TandemSocket = (function(_super) {
    __extends(TandemSocket, _super);

    TandemSocket.DEFAULTS = {
      'browser client': false,
      'log level': 1,
      'transports': ['websocket', 'xhr-polling']
    };

    function TandemSocket(tandemServer, httpServer, fileManager, options) {
      var _this = this;
      this.tandemServer = tandemServer;
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

    TandemSocket.prototype.addClient = function(file, socket, userId) {
      var _base;
      socket.broadcast.to(this.id).emit(TandemFile.routes.JOIN, userId);
      this.tandemServer.emit(this.tandemServer.events.JOIN, this, userId);
      if ((_base = file.users)[userId] == null) {
        _base[userId] = 0;
      }
      file.users[userId] += 1;
      return initSocketListeners.call(this, file, socket, userId);
    };

    TandemSocket.prototype.removeClient = function(file, socket, userId) {
      if (userId != null) {
        socket.broadcast.to(file.id).emit(TandemFile.routes.LEAVE, userId);
      }
      this.tandemServer.emit(this.tandemServer.events.LEAVE, this, userId);
      socket.leave(file.id);
      if (file.users[userId] != null) {
        return file.users[userId] -= 1;
      }
    };

    TandemSocket.prototype.broadcast = function(fileId, route, packet) {};

    TandemSocket.prototype.send = function(route, packet) {};

    return TandemSocket;

  })(TandemAdapter);

  module.exports = TandemSocket;

}).call(this);
