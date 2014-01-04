(function() {
  var EventEmitter, TandemFileManager, TandemServer, TandemSocket,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  EventEmitter = require('events').EventEmitter;

  TandemFileManager = require('./file-manager');

  TandemSocket = require('./network/socket');

  TandemServer = (function(_super) {
    __extends(TandemServer, _super);

    TandemServer.events = {
      ERROR: 'tandem-error',
      JOIN: 'file-join',
      LEAVE: 'file-leave'
    };

    TandemServer.prototype.events = TandemServer.events;

    function TandemServer(server, options) {
      var _this = this;
      if (options == null) {
        options = {};
      }
      this.fileManager = new TandemFileManager(this, options.storage, options);
      this.network = new TandemSocket(server, this.fileManager, options);
      this.network.on(TandemSocket.events.CONNECT, function(socket, fileId, userId, callback) {
        return _this.fileManager.find(fileId, function(err, file) {
          if (err != null) {
            callback(new Error('Error retrieving document'));
            return _this.emit(TandemServer.events.ERROR, err);
          } else {
            file.addClient(socket, userId);
            return callback(null);
          }
        });
      });
    }

    return TandemServer;

  })(EventEmitter);

  module.exports = TandemServer;

}).call(this);
