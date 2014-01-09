(function() {
  var EventEmitter, Tandem, TandemNetworkAdapter, _makeResyncPacket, _onMessageError,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  EventEmitter = require('events').EventEmitter;

  Tandem = require('tandem-core');

  _makeResyncPacket = function(file) {
    return {
      resync: true,
      head: file.head,
      version: file.version
    };
  };

  _onMessageError = function(err, sessionId, file, callback) {
    err.fileId = file.id;
    err.sessionId = sessionId;
    TandemEmitter.emit(TandemEmitter.events.ERROR, err);
    return callback(_makeResyncPacket(file));
  };

  TandemNetworkAdapter = (function(_super) {
    __extends(TandemNetworkAdapter, _super);

    TandemNetworkAdapter.events = {
      CONNECT: 'network-connect',
      ERROR: 'network-error'
    };

    TandemNetworkAdapter.routes = {
      RESYNC: 'ot/resync',
      SYNC: 'ot/sync',
      UPDATE: 'ot/update'
    };

    function TandemNetworkAdapter() {}

    TandemNetworkAdapter.prototype.initListeners = function(sessionId, file) {
      var _this = this;
      return this.listen(sessionId, TandemNetworkAdapter.routes.RESYNC, function(packet, callback) {
        return callback(_makeResyncPacket(file));
      }).listen(sessionId, TandemNetworkAdapter.routes.SYNC, function(packet, callback) {
        return file.sync(parseInt(packet.version), function(err, delta, version) {
          if (err != null) {
            return _onMessageError(err, sessionId, file, callback);
          } else {
            _this.join(sessionId, file.id);
            return callback({
              delta: delta,
              version: version
            });
          }
        });
      }).listen(sessionId, TandemNetworkAdapter.routes.UPDATE, function(packet, callback) {
        return file.update(Tandem.Delta.makeDelta(packet.delta), parseInt(packet.version), function(err, delta, version) {
          var broadcastPacket;
          if (err != null) {
            return _onMessageError(err, sessionId, file, callback);
          } else {
            broadcastPacket = {
              delta: delta,
              fileId: file.id,
              version: version
            };
            _this.broadcast(sessionId, file.id, TandemNetworkAdapter.routes.UPDATE, broadcastPacket);
            file.lastUpdated = Date.now();
            return callback({
              fileId: file.id,
              version: version
            });
          }
        });
      });
    };

    TandemNetworkAdapter.prototype.addClient = function(sessionId, file) {
      return this.initListeners(sessionId, file);
    };

    TandemNetworkAdapter.prototype.broadcast = function(sessionId, fileId, packet) {
      return console.warn("Should be overwritten by descendant");
    };

    TandemNetworkAdapter.prototype.checkOpen = function(fileId) {
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
