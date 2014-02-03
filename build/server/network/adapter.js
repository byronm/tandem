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

    function TandemNetworkAdapter(httpServer, fileManager) {
      this.fileManager = fileManager;
    }

    TandemNetworkAdapter.prototype.handle = function(route, fileId, packet, callback) {
      var _this = this;
      if (fileId == null) {
        return callback('Undefined fileId');
      }
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

    return TandemNetworkAdapter;

  })();

  module.exports = TandemNetworkAdapter;

}).call(this);
