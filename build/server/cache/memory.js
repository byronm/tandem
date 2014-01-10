(function() {
  var TandemCache, TandemMemoryCache, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('lodash');

  TandemCache = require('./cache');

  TandemMemoryCache = (function(_super) {
    __extends(TandemMemoryCache, _super);

    TandemMemoryCache.storage = {};

    function TandemMemoryCache(id) {
      this.id = id;
      TandemMemoryCache.__super__.constructor.apply(this, arguments);
    }

    TandemMemoryCache.prototype.del = function(key, callback) {
      delete TandemMemoryCache.storage[key];
      return callback(null);
    };

    TandemMemoryCache.prototype.get = function(key, callback) {
      return callback(null, TandemMemoryCache.storage[key]);
    };

    TandemMemoryCache.prototype.push = function(key, value, callback) {
      var _base;
      if ((_base = TandemMemoryCache.storage)[key] == null) {
        _base[key] = [];
      }
      TandemMemoryCache.storage[key].push(value);
      return callback(null, TandemMemoryCache.storage[key].length);
    };

    TandemMemoryCache.prototype.range = function(key, start, end, callback) {
      var ret;
      if (_.isFunction(end)) {
        callback = end;
        end = void 0;
      }
      ret = _.isArray(TandemMemoryCache.storage[key]) ? TandemMemoryCache.storage[key].slice(start, end) : [];
      return callback(null, ret);
    };

    TandemMemoryCache.prototype.set = function(key, value, callback) {
      TandemMemoryCache.storage[key] = value;
      return callback(null);
    };

    return TandemMemoryCache;

  })(TandemCache);

  module.exports = TandemMemoryCache;

}).call(this);
