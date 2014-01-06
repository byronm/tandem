(function() {
  var EventEmitter, TandemEmitter, TandemFileManager, TandemMemoryCache, TandemServer, TandemSocket, TandemStorage,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  EventEmitter = require('events').EventEmitter;

  TandemEmitter = require('./emitter');

  TandemFileManager = require('./file-manager');

  TandemMemoryCache = require('./cache/memory');

  TandemSocket = require('./network/socket');

  TandemStorage = require('./storage');

  TandemServer = (function(_super) {
    __extends(TandemServer, _super);

    TandemServer.events = {
      ERROR: 'tandem-error'
    };

    TandemServer.DEFAULTS = {
      cache: TandemMemoryCache,
      network: TandemSocket,
      storage: TandemStorage
    };

    function TandemServer(server, options) {
      var _this = this;
      if (options == null) {
        options = {};
      }
      this.settings = _.defaults(options, TandemServer.DEFAULTS);
      this.storage = _.isFunction(this.settings.storage) ? new this.settings.storage : this.settings.storage;
      this.fileManager = new TandemFileManager(this.storage, this.settings);
      this.network = _.isFunction(this.settings.network) ? new this.settings.network(server, this.fileManager, this.settings) : this.settings.network;
      this.network.on(TandemSocket.events.CONNECT, function(sessionId, fileId, userId, callback) {
        return _this.fileManager.find(fileId, function(err, file) {
          if (err != null) {
            callback(new Error('Error retrieving document'));
            return TandemEmitter.emit(TandemEmitter.events.ERROR, err);
          } else {
            _this.network.addClient(sessionId, userId, file);
            return callback(null);
          }
        });
      });
      TandemEmitter.on(TandemEmitter.events.ERROR, function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return _this.emit.apply(_this, [TandemServer.events.ERROR].concat(__slice.call(args)));
      });
    }

    return TandemServer;

  })(EventEmitter);

  module.exports = TandemServer;

}).call(this);
