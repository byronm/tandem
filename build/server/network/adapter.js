(function() {
  var EventEmitter, TandemNetworkAdapter,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  EventEmitter = require('events').EventEmitter;

  TandemNetworkAdapter = (function(_super) {
    __extends(TandemNetworkAdapter, _super);

    TandemNetworkAdapter.events = {
      CONNECT: 'network-connect',
      ERROR: 'network-error'
    };

    function TandemNetworkAdapter() {}

    TandemNetworkAdapter.prototype.broadcast = function() {
      return console.warn("Should be overwritten by descendant");
    };

    TandemNetworkAdapter.prototype.send = function() {
      return console.warn("Should be overwritten by descendant");
    };

    return TandemNetworkAdapter;

  })(EventEmitter);

  module.exports = TandemNetworkAdapter;

}).call(this);
