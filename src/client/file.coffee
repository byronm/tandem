Delta         = require('tandem-core/delta')


send = ->
  this.sendUpdate(@inFlight, @version, (response) =>
    @version = response.version
    @arrived = @arrived.compose(@inFlight)
    @inFlight = Delta.getIdentity(@arrived.endLength)
    sendIfReady.call(this)
  )

sendIfReady = ->
  if @inFlight.isIdentity() and !@inLine.isIdentity()
    @inFlight = @inLine
    @inLine = Delta.getIdentity(@inFlight.endLength)
    send.call(this)

warn = (args...) ->
  return unless console?.warn?
  if _.isFunction(console.warn.apply)
    console.warn(args...)
  else
    console.warn(args)

initAdapterListeners = ->
  @adapter.on(TandemFile.routes.UPDATE, (packet) =>
    if packet.fileId != @fileId
      warn("Got update for other file", packet.fileId)
    else
      unless this.remoteUpdate(packet.delta, packet.version)
        warn("Remote update failed, requesting resync")
        resync.call(this)
  ).on(TandemFile.routes.BROADCAST, (packet) =>
    type = packet.type
    packet = _.omit(packet, 'type')
    this.emit(type, packet)
  )

initHealthListeners = ->
  @adapter.on(@adapter.constructor.events.READY, =>
    this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, @health)
    sync.call(this)
  ).on(@adapter.constructor.events.RECONNECT, (transport, attempts) =>
    sync.call(this)
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

resync = (callback) ->
  this.emit(TandemFile.events.HEALTH, TandemFile.health.WARNING, @health)
  this.send(TandemFile.routes.RESYNC, {}, (response) =>
    engineResync.call(this, Delta.makeDelta(response.head), response.version)
    this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, @health)
    callback() if callback?
  )

engineResync = (delta, version) ->
  decomposed = delta.decompose(@arrived)
  this.remoteUpdate(decomposed, version)

setReady = (delta, version, resend = false) ->
  # Need to resend before emitting ready
  # Otherwise listeners on ready might immediate send an update and thus resendUpdate will duplicate packet
  this.resendUpdate() if resend
  this.emit(TandemFile.events.READY, delta, version)

sync = ->
  this.send(TandemFile.routes.SYNC, { version: @version }, (response) =>
    this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, @health)
    if response.resync
      warn("Sync requesting resync")
      engineResync.call(this, Delta.makeDelta(response.head), response.version)
    else if this.remoteUpdate(response.delta, response.version)
      setReady.call(this, response.delta, response.version, false)
    else
      warn("Remote update failed on sync, requesting resync")
      resync.call(this, =>
        setReady.call(this, response.delta, response.version, true)
      )
  , true)


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
    @version = initial.version or 0
    @arrived = initial.head or Delta.getInitial('')
    @inFlight = Delta.getIdentity(@arrived.endLength)
    @inLine = Delta.getIdentity(@arrived.endLength)
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

  transform: (indexes) ->

  update: (delta) ->
    if @inLine.canCompose(delta)
      @inLine = @inLine.compose(delta)
      sendIfReady.call(this)
    else
      this.emit(TandemFile.events.ERROR, 'Cannot compose inLine with local delta', @inLine, delta)
      warn("Local update error, attempting resync", @id, @inLine, @delta)
      resync.call(this)

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

  resendUpdate: ->
    send.call(this) unless @inFlight.isIdentity()

  sendUpdate: (delta, version, callback) ->
    packet = { delta: delta, version: version }
    updateTimeout = setTimeout( =>
      warn('Update taking over 10s to respond')
      this.emit(TandemFile.events.HEALTH, TandemFile.health.WARNING, @health)
    , 10000)
    this.send(TandemFile.routes.UPDATE, packet, (response) =>
      clearTimeout(updateTimeout)
      this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, @health) unless @health == TandemFile.health.HEALTHY
      if response.resync
        warn("Update requesting resync", @id, packet, response)
        delta = Delta.makeDelta(response.head)
        engineResync.call(this, delta, response.version)
        this.sendUpdate(@inFlight, @version, callback)
      else
        callback.call(this, response)
    )


module.exports = TandemFile
