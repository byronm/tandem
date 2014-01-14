(function() {
  var TandemEmitter, TandemFile, TandemFileManager, async, _, _check, _close, _save;

  _ = require('lodash');

  async = require('async');

  TandemEmitter = require('./emitter');

  TandemFile = require('./file');

  _check = function(force, done) {
    var _this = this;
    if (force == null) {
      force = false;
    }
    if (done == null) {
      done = function() {};
    }
    return async.each(_.values(this._files), function(file, callback) {
      if (file == null) {
        return;
      }
      if (force || file.lastUpdated + _this.settings['inactive timeout'] < Date.now()) {
        return async.waterfall([_save.bind(_this, file), _close.bind(_this, file)], function(err) {
          return callback(null);
        });
      } else {
        return callback(null);
      }
    }, function(err) {
      return done(err);
    });
  };

  _close = function(file, callback) {
    var _this = this;
    return file.close(function(err) {
      if (err != null) {
        return TandemEmitter.emit(TandemEmitter.events.ERROR, err);
      }
      delete _this._files[file.id];
      return callback(err);
    });
  };

  _save = function(file, callback) {
    var head, version,
      _this = this;
    if (!file.isDirty()) {
      return callback(null);
    }
    version = file.version;
    head = file.head;
    if (this.storage != null) {
      return file.getHistory(file.versionSaved, function(err, deltas) {
        if (err != null) {
          return callback(err);
        }
        return _this.storage.update(file.id, head, version, deltas, function(err) {
          if (err == null) {
            file.versionSaved = version;
          }
          return callback(err);
        });
      });
    } else {
      if (typeof err === "undefined" || err === null) {
        file.versionSaved = version;
      }
      return callback(null);
    }
  };

  TandemFileManager = (function() {
    TandemFileManager.DEFAULTS = {
      'check interval': 1000 * 60,
      'inactive timeout': 1000 * 60 * 15
    };

    function TandemFileManager(storage, options) {
      this.storage = storage;
      this.options = options != null ? options : {};
      this.settings = _.defaults(_.pick(options, _.keys(TandemFileManager.DEFAULTS)), TandemFileManager.DEFAULTS);
      this._files = {};
      setInterval(_check.bind(this), this.settings['check interval']);
    }

    TandemFileManager.prototype.find = function(id, callback) {
      var _this = this;
      if (this._files[id] != null) {
        return callback(null, this._files[id]);
      }
      return async.waterfall([
        function(callback) {
          return _this.storage.find(id, callback);
        }, function(head, version, callback) {
          return new TandemFile(id, head, version, _this.options, callback);
        }
      ], function(err, file) {
        if (_this._files[id] == null) {
          _this._files[id] = file;
        }
        return callback(err, _this._files[id]);
      });
    };

    TandemFileManager.prototype.stop = function(callback) {
      return _check.call(this, true, callback);
    };

    return TandemFileManager;

  })();

  module.exports = TandemFileManager;

}).call(this);
