(function() {
  var Delta, EventEmitter2, TandemFile, initAdapterListeners, initHealthListeners, initListeners, onResync, onUpdate, sendResync, sendSync, sendUpdate, setReady, warn, _,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('lodash');

  EventEmitter2 = require('eventemitter2');

  Delta = require('tandem-core/delta');

  if (EventEmitter2.EventEmitter2 != null) {
    EventEmitter2 = EventEmitter2.EventEmitter2;
  }

  initAdapterListeners = function() {
    return this.adapter.listen(TandemFile.routes.UPDATE, (function(_this) {
      return function(packet) {
        if (!_this.ready) {
          return;
        }
        if (packet.fileId !== _this.fileId) {
          return warn("Got update for other file", packet.fileId);
        }
        if (!_this.remoteUpdate(packet.delta, packet.version)) {
          warn("Remote update failed, requesting resync");
          return sendResync.call(_this);
        }
      };
    })(this));
  };

  initHealthListeners = function() {
    this.adapter.on(this.adapter.constructor.events.RECONNECT, (function(_this) {
      return function(transport, attempts) {
        return sendSync.call(_this);
      };
    })(this)).on(this.adapter.constructor.events.RECONNECTING, (function(_this) {
      return function(timeout, attempts) {
        if (attempts === 1) {
          return _this.emit(TandemFile.events.HEALTH, TandemFile.health.ERROR, _this.health);
        }
      };
    })(this)).on(this.adapter.constructor.events.DISCONNECT, (function(_this) {
      return function() {
        return _this.emit(TandemFile.events.HEALTH, TandemFile.health.ERROR, _this.health);
      };
    })(this)).on(this.adapter.constructor.events.ERROR, (function(_this) {
      return function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        _this.emit.apply(_this, [TandemFile.events.ERROR].concat(__slice.call(args)));
        return _this.emit(TandemFile.events.HEALTH, TandemFile.health.ERROR, _this.health);
      };
    })(this));
    return this.on(TandemFile.events.HEALTH, (function(_this) {
      return function(newHealth, oldHealth) {
        return _this.health = newHealth;
      };
    })(this));
  };

  initListeners = function() {
    initAdapterListeners.call(this);
    return initHealthListeners.call(this);
  };

  onResync = function(response) {
    var decomposed, delta;
    delta = Delta.makeDelta(response.head);
    decomposed = delta.decompose(this.arrived);
    this.remoteUpdate(decomposed, response.version);
    return this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, this.health);
  };

  onUpdate = function(response) {
    this.version = response.version;
    this.arrived = this.arrived.compose(this.inFlight);
    this.inFlight = Delta.getIdentity(this.arrived.endLength);
    return sendUpdateIfReady.call(this);
  };

  sendResync = function(callback) {
    this.emit(TandemFile.events.HEALTH, TandemFile.health.WARNING, this.health);
    return this.send(TandemFile.routes.RESYNC, {}, (function(_this) {
      return function(response) {
        onResync.call(_this, response);
        if (callback != null) {
          return callback();
        }
      };
    })(this));
  };

  sendSync = function(callback) {
    return this.send(TandemFile.routes.SYNC, {
      version: this.version
    }, (function(_this) {
      return function(response) {
        if (_.isFunction(callback)) {
          callback(response.error, _this);
          _this.emit(TandemFile.events.OPEN, response.error, _this);
        }
        if (response.error != null) {
          return;
        }
        _this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, _this.health);
        if (response.resync) {
          _this.ready = false;
          warn("Sync requesting resync");
          return onResync.call(_this, response);
        } else if (_this.remoteUpdate(response.delta, response.version)) {
          return setReady.call(_this, response.delta, response.version, false);
        } else {
          warn("Remote update failed on sync, requesting resync");
          return sendResync.call(_this, function() {
            return setReady.call(_this, response.delta, response.version, true);
          });
        }
      };
    })(this), true);
  };

  sendUpdate = function() {
    var callbacks, packet, updateTimeout;
    packet = {
      delta: this.inFlight,
      version: this.version
    };
    updateTimeout = setTimeout((function(_this) {
      return function() {
        warn('Update taking over 10s to respond');
        return _this.emit(TandemFile.events.HEALTH, TandemFile.health.WARNING, _this.health);
      };
    })(this), 10000);
    callbacks = this.updateCallbacks;
    this.updateCallbacks = [];
    return this.send(TandemFile.routes.UPDATE, packet, (function(_this) {
      return function(response) {
        clearTimeout(updateTimeout);
        if (response.error) {
          _.each(callbacks, function(callback) {
            return callback.call(_this, response.error);
          });
          _this.sendIfReady();
          return;
        }
        if (_this.health !== TandemFile.health.HEALTHY) {
          _this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, _this.health);
        }
        if (response.resync) {
          warn("Update requesting resync", _this.id, packet, response);
          onResync.call(_this, response);
          return sendUpdate.call(_this);
        } else {
          _this.version = response.version;
          _this.arrived = _this.arrived.compose(_this.inFlight);
          _this.inFlight = Delta.getIdentity(_this.arrived.endLength);
          _.each(callbacks, function(callback) {
            return callback.call(_this, null, _this.arrived);
          });
          return _this.sendIfReady();
        }
      };
    })(this));
  };

  setReady = function(delta, version, resend) {
    if (resend == null) {
      resend = false;
    }
    this.ready = true;
    if (resend && !this.inFlight.isIdentity()) {
      sendUpdate.call(this);
    }
    return this.emit(TandemFile.events.READY, delta, version);
  };

  warn = function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if ((typeof console !== "undefined" && console !== null ? console.warn : void 0) == null) {
      return;
    }
    if (_.isFunction(console.warn.apply)) {
      return console.warn.apply(console, args);
    } else {
      return console.warn(args);
    }
  };

  TandemFile = (function(_super) {
    __extends(TandemFile, _super);

    TandemFile.events = {
      ERROR: 'file-error',
      HEALTH: 'file-health',
      OPEN: 'file-open',
      READY: 'file-ready',
      UPDATE: 'file-update'
    };

    TandemFile.health = {
      HEALTHY: 'healthy',
      WARNING: 'warning',
      ERROR: 'error'
    };

    TandemFile.routes = {
      BROADCAST: 'broadcast',
      RESYNC: 'ot/resync',
      SYNC: 'ot/sync',
      UPDATE: 'ot/update'
    };

    function TandemFile(fileId, adapter, initial, callback) {
      this.fileId = fileId;
      this.adapter = adapter;
      if ((callback == null) && _.isFunction(initial)) {
        callback = initial;
        initial = {};
      }
      if (initial == null) {
        initial = {};
      }
      this.id = _.uniqueId('file-');
      this.health = TandemFile.health.WARNING;
      this.ready = false;
      this.version = initial.version || 0;
      this.arrived = initial.head || Delta.getInitial('');
      this.inFlight = Delta.getIdentity(this.arrived.endLength);
      this.inLine = Delta.getIdentity(this.arrived.endLength);
      this.updateCallbacks = [];
      if (this.adapter.ready) {
        this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, this.health);
        sendSync.call(this, callback);
      } else {
        this.adapter.once(this.adapter.constructor.events.READY, (function(_this) {
          return function() {
            _this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, _this.health);
            return sendSync.call(_this, callback);
          };
        })(this));
      }
      initListeners.call(this);
    }

    TandemFile.prototype.broadcast = function(type, packet, callback) {
      packet = _.clone(packet);
      packet.type = type;
      return this.adapter.send(TandemFile.routes.BROADCAST, packet, callback);
    };

    TandemFile.prototype.close = function() {
      this.adapter.close();
      return this.removeAllListeners();
    };

    TandemFile.prototype.isDirty = function() {
      return !this.inFlight.isIdentity() || !this.inLine.isIdentity();
    };

    TandemFile.prototype.remoteUpdate = function(delta, version) {
      var flightDeltaTranform, textTransform;
      this.version = version;
      delta = Delta.makeDelta(delta);
      if (this.arrived.canCompose(delta)) {
        this.arrived = this.arrived.compose(delta);
        flightDeltaTranform = delta.transform(this.inFlight, false);
        textTransform = flightDeltaTranform.transform(this.inLine, false);
        this.inFlight = this.inFlight.transform(delta, true);
        this.inLine = this.inLine.transform(flightDeltaTranform, true);
        this.emit(TandemFile.events.UPDATE, textTransform);
        return true;
      } else {
        return false;
      }
    };

    TandemFile.prototype.update = function(delta, callback) {
      if (this.inLine.canCompose(delta)) {
        this.inLine = this.inLine.compose(delta);
        return this.sendIfReady(callback);
      } else {
        this.emit(TandemFile.events.ERROR, 'Cannot compose inLine with local delta', this.inLine, delta);
        warn("Local update error, attempting resync", this.id, this.inLine, this.delta);
        return sendResync.call(this);
      }
    };

    TandemFile.prototype.send = function(route, packet, callback, priority) {
      if (callback == null) {
        callback = null;
      }
      if (priority == null) {
        priority = false;
      }
      return this.adapter.queue(route, packet, (function(_this) {
        return function(response) {
          if (response.error != null) {
            _this.emit(TandemFile.events.ERROR, response.error);
          }
          if (callback != null) {
            return callback(response);
          }
        };
      })(this), priority);
    };

    TandemFile.prototype.sendIfReady = function(callback) {
      if (callback != null) {
        this.updateCallbacks.push(callback);
      }
      if (this.inFlight.isIdentity() && !this.inLine.isIdentity()) {
        this.inFlight = this.inLine;
        this.inLine = Delta.getIdentity(this.inFlight.endLength);
        sendUpdate.call(this);
        return true;
      }
      return false;
    };

    TandemFile.prototype.transform = function(indexes) {};

    return TandemFile;

  })(EventEmitter2);

  module.exports = TandemFile;

}).call(this);
