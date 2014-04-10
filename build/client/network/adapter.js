(function() {
  var EventEmitter2, TandemNetworkAdapter, async,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  async = require('async');

  EventEmitter2 = require('eventemitter2');

  if (EventEmitter2.EventEmitter2 != null) {
    EventEmitter2 = EventEmitter2.EventEmitter2;
  }

  TandemNetworkAdapter = (function(_super) {
    __extends(TandemNetworkAdapter, _super);

    TandemNetworkAdapter.events = {
      DISCONNECT: 'adapter-disconnect',
      ERROR: 'adapter-error',
      READY: 'adapter-ready',
      RECONNECT: 'adapter-reconnect',
      RECONNECTING: 'adapter-reconnecting'
    };

    function TandemNetworkAdapter() {
      this.ready = false;
      this.sendQueue = [];
    }

    TandemNetworkAdapter.prototype.close = function() {
      return this.removeAllListeners();
    };

    TandemNetworkAdapter.prototype.listen = function(route, callback) {
      console.warn("Should be overwritten by descendant");
      return this;
    };

    TandemNetworkAdapter.prototype.queue = function(route, packet, callback, priority) {
      if (priority == null) {
        priority = false;
      }
      if (this.ready) {
        return this.send(route, packet, callback, priority);
      } else {
        if (priority) {
          return this.sendQueue.unshift([route, packet, callback]);
        } else {
          return this.sendQueue.push([route, packet, callback]);
        }
      }
    };

    TandemNetworkAdapter.prototype.send = function(route, packet, callback) {
      return console.warn("Should be overwritten by descendant");
    };

    TandemNetworkAdapter.prototype.setReady = function() {
      this.emit(TandemNetworkAdapter.events.READY);
      return async.until((function(_this) {
        return function() {
          return _this.sendQueue.length === 0;
        };
      })(this), (function(_this) {
        return function(callback) {
          var elem, packet, route, sendCallback;
          elem = _this.sendQueue.shift();
          route = elem[0], packet = elem[1], sendCallback = elem[2];
          return _this.send(route, packet, function() {
            var args;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            if (sendCallback != null) {
              sendCallback.apply(_this, args);
            }
            return callback();
          });
        };
      })(this), (function(_this) {
        return function(err) {
          return _this.ready = true;
        };
      })(this));
    };

    return TandemNetworkAdapter;

  })(EventEmitter2);

  module.exports = TandemNetworkAdapter;

}).call(this);
