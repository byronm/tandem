(function() {
  var EventEmitter, emitter;

  EventEmitter = require('events').EventEmitter;

  emitter = new EventEmitter;

  emitter.events = {
    ERROR: 'tandem-error'
  };

  module.exports = emitter;

}).call(this);
