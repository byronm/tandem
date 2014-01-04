EventEmitter = require('events').EventEmitter


class TandemNetworkAdapter extends EventEmitter
  @events:
    CONNECT : 'network-connect'
    ERROR   : 'network-error'

  constructor: ->

  broadcast: ->
    console.warn "Should be overwritten by descendant"

  send: ->
    console.warn "Should be overwritten by descendant"


module.exports = TandemNetworkAdapter
