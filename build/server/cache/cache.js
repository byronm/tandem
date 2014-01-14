(function() {
  var TandemCache, _,
    __slice = [].slice;

  _ = require('lodash');

  TandemCache = (function() {
    TandemCache.OPERATIONS = ['del', 'get', 'push', 'range', 'set'];

    function TandemCache(id) {
      var _this = this;
      this.id = id;
      _.each(TandemCache.OPERATIONS, function(fnName) {
        return _this[fnName] = _.wrap(_this[fnName], function() {
          var args, fn, key;
          fn = arguments[0], key = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
          return fn.call.apply(fn, [_this, "" + _this.id + "-" + key].concat(__slice.call(args)));
        });
      });
    }

    TandemCache.prototype.del = function(key, callback) {
      return console.warn("Should be overwritten by descendant");
    };

    TandemCache.prototype.get = function(key, callback) {
      return console.warn("Should be overwritten by descendant");
    };

    TandemCache.prototype.push = function(key, value, callback) {
      return console.warn("Should be overwritten by descendant");
    };

    TandemCache.prototype.range = function(key, start, end, callback) {
      return console.warn("Should be overwritten by descendant");
    };

    TandemCache.prototype.set = function(key, value, callback) {
      return console.warn("Should be overwritten by descendant");
    };

    return TandemCache;

  })();

  module.exports = TandemCache;

}).call(this);
