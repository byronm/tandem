# Share event emitter across modules

EventEmitter  = require('events').EventEmitter

emitter = new EventEmitter
emitter.events = 
  ERROR: 'tandem-error'

module.exports = emitter
