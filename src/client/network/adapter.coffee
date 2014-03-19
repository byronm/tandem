async = require('async')
EventEmitter2 = require('eventemitter2')

# Client may include a different EventEmitter2
if EventEmitter2.EventEmitter2?
  EventEmitter2 = EventEmitter2.EventEmitter2

class TandemNetworkAdapter extends EventEmitter2
  @events:
    DISCONNECT   : 'adapter-disconnect'
    ERROR        : 'adapter-error'
    READY        : 'adapter-ready'
    RECONNECT    : 'adapter-reconnect'
    RECONNECTING : 'adapter-reconnecting'

  constructor: ->
    @ready = false
    @sendQueue = []
    # Descendant responsible for calling setReady()

  close: ->
    this.removeAllListeners()

  listen: (route, callback) ->
    console.warn "Should be overwritten by descendant"
    return this

  queue: (route, packet, callback, priority = false) ->
    if @ready
      this.send(route, packet, callback, priority)
    else
      if priority
        @sendQueue.unshift([route, packet, callback])
      else
        @sendQueue.push([route, packet, callback])

  send: (route, packet, callback) ->
    console.warn "Should be overwritten by descendant"

  setReady: ->
    this.emit(TandemNetworkAdapter.events.READY)
    async.until( =>
      return @sendQueue.length == 0
    , (callback) =>
      elem = @sendQueue.shift()
      [route, packet, sendCallback] = elem
      this.send(route, packet, (args...) =>
        sendCallback.apply(this, args) if sendCallback?
        callback()
      )
    , (err) =>
      @ready = true
    )


module.exports = TandemNetworkAdapter
