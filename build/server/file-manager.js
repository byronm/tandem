(function() {
  var Tandem, TandemEmitter, TandemFile, TandemFileManager, async, _, _check, _close, _save;

  _ = require('underscore')._;

  async = require('async');

  Tandem = require('tandem-core');

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
    return async.each(_.values(this.files), function(file, callback) {
      var usersConnected;
      if ((file == null) || _.isArray(file)) {
        return;
      }
      usersConnected = _.any(file.users, function(online, userId) {
        return online > 0;
      });
      if (force || !usersConnected || file.lastUpdated + _this.settings['inactive timeout'] < Date.now()) {
        return _save.call(_this, file, function(err) {
          if (err != null) {
            return TandemEmitter.emit(TandemEmitter.events.ERROR, err);
          }
          if (usersConnected && !force) {
            return callback(null);
          } else {
            return _close.call(_this, file, callback);
          }
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
        delete _this.files[file.id];
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

    function TandemFileManager(storage, options) {
      var _this = this;
      this.storage = storage;
      this.options = options != null ? options : {};
      this.settings = _.defaults(_.pick(options, _.keys(TandemFileManager.DEFAULTS)), TandemFileManager.DEFAULTS);
      this.files = {};
      setInterval(function() {
        return _check.call(_this);
      }, this.settings['check interval']);
      process.on('SIGTERM', function() {
        return _check.call(_this, true, function(err) {
          if (err != null) {
            TandemEmitter.emit(TandemEmitter.events.ERROR, err);
          }
          return process.exit(err != null ? 1 : 0);
        });
      });
    }

    TandemFileManager.prototype.find = function(id, callback) {
      var _this = this;
      if (this.files[id] != null) {
        if (_.isArray(this.files[id])) {
          return this.files[id].push(callback);
        } else {
          return callback(null, this.files[id]);
        }
      } else {
        this.files[id] = [callback];
        return async.waterfall([
          function(callback) {
            if (_this.storage != null) {
              return _this.storage.find(id, callback);
            } else {
              return callback(null, Tandem.Delta.getInitial(''), 0);
            }
          }, function(head, version, callback) {
            return new TandemFile(id, head, version, _this.options, callback);
          }
        ], function(err, file) {
          var callbacks;
          callbacks = _this.files[id];
          _this.files[id] = err != null ? void 0 : file;
          return _.each(callbacks, function(callback) {
            return callback(err, file);
          });
        });
      }
    };

    return TandemFileManager;

  })();

  module.exports = TandemFileManager;

}).call(this);
