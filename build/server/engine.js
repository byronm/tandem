(function() {
  var EngineError, EventEmitter, Tandem, TandemServerEngine, async, _, _atomic, _getLoadedVersion,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore')._;

  async = require('async');

  EventEmitter = require('events').EventEmitter;

  Tandem = require('tandem-core');

  _atomic = function(fn) {
    var _this = this;
    return async.until(function() {
      return _this.locked === false;
    }, function(callback) {
      return setTimeout(callback, 100);
    }, function() {
      _this.locked = true;
      return fn(function() {
        return _this.locked = false;
      });
    });
  };

  _getLoadedVersion = function(callback) {
    var _this = this;
    return this.cache.range('history', 0, 1, function(err, range) {
      if (err != null) {
        return callback(err);
      }
      if (range.length > 0) {
        return callback(null, JSON.parse(range[0]).version - 1);
      } else {
        return callback(null, -1);
      }
    });
  };

  EngineError = (function(_super) {
    __extends(EngineError, _super);

    function EngineError(message, engine) {
      var _ref, _ref1, _ref2, _ref3;
      this.message = message;
      this.version = engine.version;
      this.versionLoaded = engine.versionLoaded;
      this.head = {
        startLength: (_ref = engine.head) != null ? _ref.startLength : void 0,
        endLength: (_ref1 = engine.head) != null ? _ref1.endLength : void 0,
        opsLength: (_ref2 = engine.head) != null ? (_ref3 = _ref2.ops) != null ? _ref3.length : void 0 : void 0
      };
    }

    return EngineError;

  })(Error);

  TandemServerEngine = (function(_super) {
    __extends(TandemServerEngine, _super);

    TandemServerEngine.events = {
      UPDATE: 'update'
    };

    function TandemServerEngine(cache, head, version, callback) {
      var _this = this;
      this.cache = cache;
      this.head = head;
      this.version = version;
      this.id = _.uniqueId('engine-');
      this.locked = false;
      async.waterfall([
        function(callback) {
          return _getLoadedVersion.call(_this, callback);
        }, function(cacheVersion, callback) {
          if (cacheVersion === -1) {
            _this.versionLoaded = _this.version;
            return callback(null, []);
          } else {
            _this.versionLoaded = cacheVersion;
            return _this.getHistory(_this.version, callback);
          }
        }
      ], function(err, deltas) {
        if (err == null) {
          _.each(deltas, function(delta) {
            _this.head = _this.head.compose(delta);
            return _this.version += 1;
          });
        }
        return callback(err, _this);
      });
    }

    TandemServerEngine.prototype.getDeltaSince = function(version, callback) {
      var _this = this;
      if (version < 0) {
        return callback(new EngineError("Negative version", this));
      }
      if (version === 0) {
        return callback(null, this.head, this.version);
      }
      if (version === this.version) {
        return callback(null, Tandem.Delta.getIdentity(this.head.endLength), this.version);
      }
      return this.getHistory(version, function(err, deltas) {
        var delta, firstHist;
        if (err != null) {
          return callback(err);
        }
        if (deltas.length === 0) {
          return callback(new EngineError("No version " + version + " in history", _this));
        }
        firstHist = deltas.shift();
        delta = _.reduce(deltas, function(delta, hist) {
          return delta.compose(hist);
        }, firstHist);
        return callback(null, delta, _this.version);
      });
    };

    TandemServerEngine.prototype.getHistory = function(version, callback) {
      var _this = this;
      return this.cache.range('history', version - this.versionLoaded, function(err, range) {
        var deltas;
        if (err != null) {
          return callback(err);
        }
        deltas = _.map(range, function(changeset) {
          return Tandem.Delta.makeDelta(JSON.parse(changeset).delta);
        });
        return callback(null, deltas);
      });
    };

    TandemServerEngine.prototype.transform = function(delta, version, callback) {
      var _this = this;
      if (version < this.versionLoaded) {
        return callback(new EngineError("No version in history", this));
      }
      return this.getHistory(version, function(err, deltas) {
        if (err != null) {
          return callback(err);
        }
        delta = _.reduce(deltas, function(delta, hist) {
          return delta.transform(hist, true);
        }, delta);
        return callback(null, delta, _this.version);
      });
    };

    TandemServerEngine.prototype.update = function(delta, version, callback) {
      var changeset,
        _this = this;
      changeset = {};
      return _atomic.call(this, function(done) {
        return async.waterfall([
          function(callback) {
            return _this.transform(delta, version, callback);
          }, function(delta, version, callback) {
            if (_this.head.canCompose(delta)) {
              changeset = {
                delta: delta,
                version: _this.version + 1
              };
              return _this.cache.push('history', JSON.stringify(changeset), callback);
            } else {
              return callback(new EngineError('Cannot compose deltas', _this));
            }
          }, function(length, callback) {
            _this.head = _this.head.compose(changeset.delta);
            _this.version += 1;
            return callback(null);
          }
        ], function(err, delta, version) {
          callback(err, changeset.delta, changeset.version);
          _this.emit(TandemServerEngine.events.UPDATE, changeset.delta, changeset.version);
          return done();
        });
      });
    };

    return TandemServerEngine;

  })(EventEmitter);

  module.exports = TandemServerEngine;

}).call(this);
