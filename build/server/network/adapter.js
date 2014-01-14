(function() {
  var EventEmitter, Tandem, TandemEmitter, TandemNetworkAdapter, _makeResyncPacket, _onMessageError;

  EventEmitter = require('events').EventEmitter;

  Tandem = require('tandem-core');

  TandemEmitter = require('../emitter');

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

  TandemNetworkAdapter = (function() {
    TandemNetworkAdapter.routes = {
      RESYNC: 'ot/resync',
      SYNC: 'ot/sync',
      UPDATE: 'ot/update'
    };

    function TandemNetworkAdapter(httpServer, fileManager, storage, options) {
      this.fileManager = fileManager;
      this.storage = storage;
      if (options == null) {
        options = {};
      }
    }

    TandemNetworkAdapter.prototype.initListeners = function(sessionId, fileId) {
      var _this = this;
      return this.listen(sessionId, TandemNetworkAdapter.routes.RESYNC, function(packet, callback) {
        return _this.fileManager.find(fileId, function(err, file) {
          return callback(_makeResyncPacket(file));
        });
      }).listen(sessionId, TandemNetworkAdapter.routes.SYNC, function(packet, callback) {
        return _this.fileManager.find(fileId, function(err, file) {
          if (err != null) {
            if (err != null) {
              TandemEmitter.emit(TandemEmitter.events.ERROR, err);
            }
            callback({
              error: 'Error retrieving document'
            });
            return;
          }
          return file.sync(parseInt(packet.version), function(err, delta, version) {
            if (err != null) {
              return _onMessageError(err, sessionId, file, callback);
            } else {
              return callback({
                delta: delta,
                version: version
              });
            }
          });
        });
      }).listen(sessionId, TandemNetworkAdapter.routes.UPDATE, function(packet, callback) {
        return _this.fileManager.find(fileId, function(err, file) {
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
              return callback({
                fileId: file.id,
                version: version
              });
            }
          });
        });
      });
    };

    TandemNetworkAdapter.prototype.join = function(sessionId, fileId) {
      return this.initListeners(sessionId, fileId);
    };

    TandemNetworkAdapter.prototype.broadcast = function(sessionId, fileId, packet) {
      return console.warn("broadcast should be overwritten by descendant");
    };

    TandemNetworkAdapter.prototype.checkOpen = function(fileId) {
      return console.warn("checkOpen should be overwritten by descendant");
    };

    TandemNetworkAdapter.prototype.listen = function(fileId, route, callback) {
      console.warn("listen should be overwritten by descendant");
      return this;
    };

    return TandemNetworkAdapter;

  })();

  module.exports = TandemNetworkAdapter;

}).call(this);
