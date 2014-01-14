(function() {
  var TandemEmitter, TandemFile, TandemFileManager, async, _, _check, _close, _save;

  _ = require('lodash')._;

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
      var isClosed;
      if ((file == null) || _.isArray(file)) {
        return;
      }
      isClosed = !_this.network.checkOpen(file.id);
      if (force || isClosed || file.lastUpdated + _this.settings['inactive timeout'] < Date.now()) {
        return _save.call(_this, file, function(err) {
          if (err != null) {
            return TandemEmitter.emit(TandemEmitter.events.ERROR, err);
          }
          if (isClosed) {
            return _close.call(_this, file, callback);
          }
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
        TandemEmitter.emit(TandemEmitter.events.ERROR, err);
      } else {
        delete _this._files[file.id];
      }
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

    function TandemFileManager(network, storage, options) {
      var _this = this;
      this.network = network;
      this.storage = storage;
      this.options = options != null ? options : {};
      this.settings = _.defaults(_.pick(options, _.keys(TandemFileManager.DEFAULTS)), TandemFileManager.DEFAULTS);
      this._files = {};
      setInterval(function() {
        return _check.call(_this);
      }, this.settings['check interval']);
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
