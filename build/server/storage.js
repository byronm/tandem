(function() {
  var Tandem, TandemStorage;

  Tandem = require('tandem-core');

  TandemStorage = (function() {
    function TandemStorage() {}

    TandemStorage.prototype.authorize = function(authPacket, callback) {
      return callback(null);
    };

    TandemStorage.prototype.find = function(fileId, callback) {
      return callback(null, Tandem.Delta.getInitial(''), 0);
    };

    TandemStorage.prototype.update = function(fileId, head, version, deltas, callback) {
      return callback(null);
    };

    return TandemStorage;

  })();

  module.exports = TandemStorage;

}).call(this);
