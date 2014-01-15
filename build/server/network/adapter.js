(function() {
  var EventEmitter, Tandem, TandemNetworkAdapter, _makeResyncPacket, _onMessageError;

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
      this.files = {};
    }

    TandemNetworkAdapter.prototype.handle = function(route, sessionId, packet, callback) {
      var fileId,
        _this = this;
      fileId = this.files[sessionId];
      return this.fileManager.find(fileId, function(err, file) {
        var resyncHandler;
        if (err != null) {
          return callback(err, {
            error: err
          });
        }
        resyncHandler = function(err, file, callback) {
          return callback(err, _makeResyncPacket(file));
        };
        switch (route) {
          case TandemNetworkAdapter.routes.RESYNC:
            return resyncHandler(null, file, callback);
          case TandemNetworkAdapter.routes.SYNC:
            if (err != null) {
              return resyncHandler(err, file, callback);
            }
            return file.sync(parseInt(packet.version), function(err, delta, version) {
              return callback(err, {
                delta: delta,
                version: version
              });
            });
          case TandemNetworkAdapter.routes.UPDATE:
            if (err != null) {
              return resyncHandler(err, file, callback);
            }
            return file.update(Tandem.Delta.makeDelta(packet.delta), parseInt(packet.version), function(err, delta, version) {
              return callback(err, {
                fileId: fileId,
                version: version
              }, {
                delta: delta,
                fileId: fileId,
                version: version
              });
            });
          default:
            return callback(new Error('Unexpected network route'));
        }
      });
    };

    TandemNetworkAdapter.prototype.join = function(sessionId, fileId) {
      return this.files[sessionId] = fileId;
    };

    TandemNetworkAdapter.prototype.leave = function(sessionId, fileId) {
      return delete this.files[sessionId];
    };

    return TandemNetworkAdapter;

  })();

  module.exports = TandemNetworkAdapter;

}).call(this);
