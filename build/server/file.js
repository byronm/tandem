(function() {
  var EventEmitter, TandemEmitter, TandemEngine, TandemFile, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore')._;

  EventEmitter = require('events').EventEmitter;

  TandemEmitter = require('./emitter');

  TandemEngine = require('./engine');

  TandemFile = (function(_super) {
    __extends(TandemFile, _super);

    TandemFile.routes = {
      BROADCAST: 'broadcast',
      JOIN: 'user/join',
      LEAVE: 'user/leave',
      RESYNC: 'ot/resync',
      SYNC: 'ot/sync',
      UPDATE: 'ot/update'
    };

    function TandemFile(id, initial, version, options, callback) {
      var _this = this;
      this.id = id;
      this.versionSaved = version;
      this.users = {};
      this.cache = _.isFunction(options.cache) ? new options.cache(this.id) : options.cache;
      this.engine = new TandemEngine(this.cache, initial, version, function(err, engine) {
        _this.engine = engine;
        return callback(err, _this);
      });
      this.lastUpdated = Date.now();
    }

    TandemFile.prototype.close = function(callback) {
      return this.cache.del('history', callback);
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

    TandemFile.prototype.sync = function(version, callback) {
      return this.engine.getDeltaSince(version, callback);
    };

    TandemFile.prototype.update = function(clientDelta, clientVersion, callback) {
      return this.engine.update(clientDelta, clientVersion, callback);
    };

    return TandemFile;

  })(EventEmitter);

  module.exports = TandemFile;

}).call(this);
