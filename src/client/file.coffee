Delta = require('tandem-core/delta')


warn = (args...) ->
  return unless console?.warn?
  if _.isFunction(console.warn.apply)
    console.warn(args...)
  else
    console.warn(args)

initAdapterListeners = ->
  @adapter.listen(TandemFile.routes.UPDATE, (packet) =>
    return unless @ready
    return warn("Got update for other file", packet.fileId) if packet.fileId != @fileId
    if !this.remoteUpdate(packet.delta, packet.version)
      warn("Remote update failed, requesting resync")
      sendResync.call(this)
  )

initHealthListeners = ->
  @adapter.on(@adapter.constructor.events.READY, =>
    this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, @health)
    sendSync.call(this)
  ).on(@adapter.constructor.events.RECONNECT, (transport, attempts) =>
    sendSync.call(this)
  ).on(@adapter.constructor.events.RECONNECTING, (timeout, attempts) =>
    this.emit(TandemFile.events.HEALTH, TandemFile.health.ERROR, @health) if attempts == 1
  ).on(@adapter.constructor.events.DISCONNECT, =>
    this.emit(TandemFile.events.HEALTH, TandemFile.health.ERROR, @health)
  ).on(@adapter.constructor.events.ERROR, (args...) =>
    this.emit(TandemFile.events.ERROR, args...)
    this.emit(TandemFile.events.HEALTH, TandemFile.health.ERROR, @health)
  )
  this.on(TandemFile.events.HEALTH, (newHealth, oldHealth) =>
    @health = newHealth
  )

initListeners = ->
  initAdapterListeners.call(this)
  initHealthListeners.call(this)

onResync = (response) ->
  delta = Delta.makeDelta(response.head)
  decomposed = delta.decompose(@arrived)
  this.remoteUpdate(decomposed, response.version)
  this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, @health)

onUpdate = (response) ->
  @version = response.version
  @arrived = @arrived.compose(@inFlight)
  @inFlight = Delta.getIdentity(@arrived.endLength)
  sendUpdateIfReady.call(this)

sendResync = (callback) ->
  this.emit(TandemFile.events.HEALTH, TandemFile.health.WARNING, @health)
  this.send(TandemFile.routes.RESYNC, {}, (response) =>
    onResync.call(this, response)
    callback() if callback?
  )

sendSync = ->
  this.send(TandemFile.routes.SYNC, { version: @version }, (response) =>
    this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, @health)
    if response.resync
      @ready = false
      warn("Sync requesting resync")
      onResync.call(this, response)
    else if this.remoteUpdate(response.delta, response.version)
      setReady.call(this, response.delta, response.version, false)
    else
      warn("Remote update failed on sync, requesting resync")
      sendResync.call(this, =>
        setReady.call(this, response.delta, response.version, true)
      )
  , true)

sendUpdate = ->
  packet = { delta: @inFlight, version: @version }
  updateTimeout = setTimeout( =>
    warn('Update taking over 10s to respond')
    this.emit(TandemFile.events.HEALTH, TandemFile.health.WARNING, @health)
  , 10000)
  this.send(TandemFile.routes.UPDATE, packet, (response) =>
    clearTimeout(updateTimeout)
    this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, @health) unless @health == TandemFile.health.HEALTHY
    if response.resync
      warn("Update requesting resync", @id, packet, response)
      onResync.call(this, response)
      sendUpdate.call(this)
    else
      @version = response.version
      @arrived = @arrived.compose(@inFlight)
      @inFlight = Delta.getIdentity(@arrived.endLength)
      _.each(@updateCallbacks, (callback) =>
        callback.call(this, null, @arrived)
      )
      @updateCallbacks = []
      _.defer( =>
        this.sendIfReady()
      )
  )

setReady = (delta, version, resend = false) ->
  @ready = true
  # May need to resend before emitting ready since listeners on ready might immediately 
  # send an update and thus if send is after it will duplicate the packet
  sendUpdate.call(this) if resend and !@inFlight.isIdentity()
  this.emit(TandemFile.events.READY, delta, version)


class TandemFile extends EventEmitter2
  @events:
    ERROR   : 'file-error'
    HEALTH  : 'file-health'
    READY   : 'file-ready'
    UPDATE  : 'file-update'

  @health:
    HEALTHY : 'healthy'
    WARNING : 'warning'
    ERROR   : 'error'

  @routes:
    BROADCAST : 'broadcast'
    RESYNC    : 'ot/resync'
    SYNC      : 'ot/sync'
    UPDATE    : 'ot/update'

  constructor: (@fileId, @adapter, initial = {}) ->
    @id = _.uniqueId('file-')
    @health = TandemFile.health.WARNING
    @ready = false
    @version = initial.version or 0
    @arrived = initial.head or Delta.getInitial('')
    @inFlight = Delta.getIdentity(@arrived.endLength)
    @inLine = Delta.getIdentity(@arrived.endLength)
    @updateCallbacks = []
    if @adapter.ready
      this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, @health)
      sendSync.call(this)
    initListeners.call(this)

  broadcast: (type, packet, callback) ->
    packet = _.clone(packet)
    packet.type = type
    @adapter.send(TandemFile.routes.BROADCAST, packet, callback)

  close: ->
    @adapter.close()
    this.removeAllListeners()

  isDirty: ->
    return !@inFlight.isIdentity() or !@inLine.isIdentity()

  remoteUpdate: (delta, @version) ->
    delta = Delta.makeDelta(delta)
    if @arrived.canCompose(delta)
      @arrived = @arrived.compose(delta)
      flightDeltaTranform = delta.transform(@inFlight, false)
      textTransform = flightDeltaTranform.transform(@inLine, false)
      @inFlight = @inFlight.transform(delta, true)
      @inLine = @inLine.transform(flightDeltaTranform, true)
      this.emit(TandemFile.events.UPDATE, textTransform)
      return true
    else
      return false

  update: (delta, callback) ->
    if @inLine.canCompose(delta)
      @inLine = @inLine.compose(delta)
      this.sendIfReady(callback)
    else
      this.emit(TandemFile.events.ERROR, 'Cannot compose inLine with local delta', @inLine, delta)
      warn("Local update error, attempting resync", @id, @inLine, @delta)
      sendResync.call(this)

  send: (route, packet, callback = null, priority = false) ->
    if callback?
      @adapter.send(route, packet, (response) =>
        unless response.error?
          callback(response) if callback?
        else
          this.emit(TandemFile.events.ERROR, response.error)
      , priority)
    else
      @adapter.send(route, packet)

  sendIfReady: (callback) ->   # Exposed for fuzzer
    @updateCallbacks.push(callback) if callback?
    if @inFlight.isIdentity() and !@inLine.isIdentity()
      @inFlight = @inLine
      @inLine = Delta.getIdentity(@inFlight.endLength)
      sendUpdate.call(this)
      return true
    return false

  transform: (indexes) ->


module.exports = TandemFile
