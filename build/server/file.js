(function() {
  var EventEmitter, Tandem, TandemEngine, TandemFile, TandemMemoryCache, initSocketListeners, resync, sync, update, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore')._;

  EventEmitter = require('events').EventEmitter;

  Tandem = require('tandem-core');

  TandemEngine = require('./engine');

  TandemMemoryCache = require('./cache/memory');

  initSocketListeners = function(socket, userId) {
    var _this = this;
    _.each(TandemFile.routes, function(route, name) {
      return socket.removeAllListeners(route);
    });
    return socket.on(TandemFile.routes.RESYNC, function(packet, callback) {
      return resync.call(_this, callback);
    }).on(TandemFile.routes.SYNC, function(packet, callback) {
      return sync.call(_this, socket, userId, packet, callback);
    }).on(TandemFile.routes.UPDATE, function(packet, callback) {
      return update.call(_this, socket, userId, packet, callback);
    }).on(TandemFile.routes.BROADCAST, function(packet, callback) {
      packet['userId'] = userId;
      socket.broadcast.to(_this.id).emit(TandemFile.routes.BROADCAST, packet);
      if (callback != null) {
        return callback({});
      }
    }).on('disconnect', function() {
      return _this.removeClient(socket, userId);
    });
  };

  resync = function(callback) {
    return callback({
      resync: true,
      head: this.engine.head,
      version: this.engine.version,
      users: this.users
    });
  };

  sync = function(socket, userId, packet, callback) {
    var _this = this;
    return this.engine.getDeltaSince(parseInt(packet.version), function(err, delta, version, next) {
      if (err != null) {
        err.fileId = _this.id;
        err.userId = userId;
        _this.server.emit(_this.server.events.ERROR, err);
        return resync.call(_this, callback);
      }
      socket.join(_this.id);
      return callback({
        delta: delta,
        users: _this.users,
        version: version
      });
    });
  };

  update = function(socket, userId, packet, callback) {
    var delta, version,
      _this = this;
    delta = Tandem.Delta.makeDelta(packet.delta);
    version = parseInt(packet.version);
    return this.engine.update(delta, version, function(err, delta, version) {
      var broadcastPacket;
      if (err != null) {
        err.fileId = _this.id;
        err.userId = userId;
        _this.server.emit(_this.server.events.ERROR, err);
        return resync.call(_this, callback);
      }
      broadcastPacket = {
        delta: delta,
        fileId: _this.id,
        version: version
      };
      broadcastPacket['userId'] = userId;
      socket.broadcast.to(_this.id).emit(TandemFile.routes.UPDATE, broadcastPacket);
      _this.lastUpdated = Date.now();
      return callback({
        fileId: _this.id,
        version: version
      });
    });
  };

  TandemFile = (function(_super) {
    __extends(TandemFile, _super);

    TandemFile.DEFAULTS = {
      'cache': TandemMemoryCache
    };

    TandemFile.routes = {
      BROADCAST: 'broadcast',
      JOIN: 'user/join',
      LEAVE: 'user/leave',
      RESYNC: 'ot/resync',
      SYNC: 'ot/sync',
      UPDATE: 'ot/update'
    };

    TandemFile.prototype.routes = TandemFile.routes;

    function TandemFile(server, id, initial, version, options, callback) {
      var _this = this;
      this.server = server;
      this.id = id;
      this.settings = _.defaults(_.pick(options, _.keys(TandemFile.DEFAULTS)), TandemFile.DEFAULTS);
      this.versionSaved = version;
      this.users = {};
      this.cache = new this.settings['cache'](this.id);
      this.engine = new TandemEngine(this.cache, initial, version, function(err, engine) {
        _this.engine = engine;
        return callback(err, _this);
      });
      this.lastUpdated = Date.now();
    }

    TandemFile.prototype.addClient = function(socket, userId) {
      var _base;
      socket.broadcast.to(this.id).emit(TandemFile.routes.JOIN, userId);
      this.server.emit(this.server.events.JOIN, this, userId);
      if ((_base = this.users)[userId] == null) {
        _base[userId] = 0;
      }
      this.users[userId] += 1;
      return initSocketListeners.call(this, socket, userId);
    };

    TandemFile.prototype.close = function(callback) {
      return this.cache.del('history', callback);
    };

    TandemFile.prototype.removeClient = function(socket, userId) {
      if (userId != null) {
        socket.broadcast.to(this.id).emit(TandemFile.routes.LEAVE, userId);
      }
      this.server.emit(this.server.events.LEAVE, this, userId);
      socket.leave(this.id);
      if (this.users[userId] != null) {
        return this.users[userId] -= 1;
      }
    };

    TandemFile.prototype.getHead = function() {
      return this.engine.head;
    };

    TandemFile.prototype.getHistory = function(version, callback) {
      return this.engine.getHistory(version, callback);
    };

    TandemFile.prototype.getVersion = function() {
      return this.engine.version;
    };

    TandemFile.prototype.isDirty = function() {
      return this.engine.version !== this.versionSaved;
    };

    return TandemFile;

  })(EventEmitter);

  module.exports = TandemFile;

}).call(this);
