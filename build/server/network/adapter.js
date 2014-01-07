(function() {
  var EventEmitter, Tandem, TandemFile, TandemNetworkAdapter, _makeResyncPacket, _onMessageError,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  EventEmitter = require('events').EventEmitter;

  Tandem = require('tandem-core');

  TandemFile = require('../file');

  _makeResyncPacket = function(file) {
    return {
      resync: true,
      head: file.head,
      version: file.version
    };
  };

  _onMessageError = function(err, file, callback) {
    err.fileId = file.id;
    err.userId = userId;
    TandemEmitter.emit(TandemEmitter.events.ERROR, err);
    return callback(_makeResyncPacket(file));
  };

  TandemNetworkAdapter = (function(_super) {
    __extends(TandemNetworkAdapter, _super);

    TandemNetworkAdapter.events = {
      CONNECT: 'network-connect',
      ERROR: 'network-error'
    };

    function TandemNetworkAdapter() {}

    TandemNetworkAdapter.prototype.initListeners = function(sessionId, userId, file) {
      var _this = this;
      return this.listen(sessionId, TandemFile.routes.RESYNC, function(packet, callback) {
        return callback(_makeResyncPacket(file));
      }).listen(sessionId, TandemFile.routes.SYNC, function(packet, callback) {
        return file.sync(parseInt(packet.version), function(err, delta, version) {
          if (err != null) {
            return _onMessageError(err, file, callback);
          } else {
            _this.join(sessionId, file.id);
            return callback({
              delta: delta,
              version: version
            });
          }
        });
      }).listen(sessionId, TandemFile.routes.UPDATE, function(packet, callback) {
        return file.update(Tandem.Delta.makeDelta(packet.delta), parseInt(packet.version), function(err, delta, version) {
          var broadcastPacket;
          if (err != null) {
            return _onMessageError(err, file, callback);
          } else {
            broadcastPacket = {
              delta: delta,
              fileId: file.id,
              version: version
            };
            broadcastPacket['userId'] = userId;
            _this.broadcast(sessionId, file.id, TandemFile.routes.UPDATE, broadcastPacket);
            file.lastUpdated = Date.now();
            return callback({
              fileId: file.id,
              version: version
            });
          }
        });
      }).listen(sessionId, TandemFile.routes.BROADCAST, function(packet, callback) {
        packet['userId'] = userId;
        _this.broadcast(sessionId, file.id, TandemFile.routes.BROADCAST, packet);
        if (callback != null) {
          return callback({});
        }
      });
    };

    TandemNetworkAdapter.prototype.addClient = function(sessionId, userId, file) {
      return this.initListeners(sessionId, userId, file);
    };

    TandemNetworkAdapter.prototype.broadcast = function(sessionId, roomId, packet) {
      return console.warn("Should be overwritten by descendant");
    };

    TandemNetworkAdapter.prototype.join = function(fileId) {
      return console.warn("Should be overwritten by descendant");
    };

    TandemNetworkAdapter.prototype.leave = function(fileId) {
      return console.warn("Should be overwritten by descendant");
    };

    TandemNetworkAdapter.prototype.listen = function(fileId, route, callback) {
      console.warn("Should be overwritten by descendant");
      return this;
    };

    return TandemNetworkAdapter;

  })(EventEmitter);

  module.exports = TandemNetworkAdapter;

}).call(this);
