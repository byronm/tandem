Delta         = require('tandem-core/delta')
TandemEngine  = require('./engine')


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
      unless @engine.remoteUpdate(packet.delta, packet.version)
        warn("Remote update failed, requesting resync")
        resync.call(this)
  ).on(TandemFile.routes.BROADCAST, (packet) =>
    type = packet.type
    packet = _.omit(packet, 'type')
    this.emit(type, packet)
  )

initEngine = (initial, version) ->
  @engine = new TandemEngine(initial, version, (delta, version, callback) =>
    sendUpdate.call(this, delta, version, callback)
  )

initEngineListeners = ->
  @engine.on(TandemEngine.events.UPDATE, (delta) =>
    this.emit(TandemFile.events.UPDATE, delta)
  ).on(TandemEngine.events.ERROR, (args...) =>
    this.emit(TandemFile.events.ERROR, this, args...)
    warn("Engine error, attempting resync", @id, args...)
    resync.call(this)
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
  initEngineListeners.call(this)
  initHealthListeners.call(this)

resync = (callback) ->
  this.emit(TandemFile.events.HEALTH, TandemFile.health.WARNING, @health)
  this.send(TandemFile.routes.RESYNC, {}, (response) =>
    @engine.resync(Delta.makeDelta(response.head), response.version)
    this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, @health)
    callback() if callback?
  )

sendUpdate = (delta, version, callback) ->
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
      @engine.resync(delta, response.version)
      sendUpdate.call(this, @engine.inFlight, @engine.version, callback)
    else
      callback.call(this, response)
  )

setReady = (delta, version, resend = false) ->
  # Need to resend before emitting ready
  # Otherwise listeners on ready might immediate send an update and thus resendUpdate will duplicate packet
  @engine.resendUpdate() if resend
  this.emit(TandemFile.events.READY, delta, version)

sync = ->
  this.send(TandemFile.routes.SYNC, { version: @engine.version }, (response) =>
    this.emit(TandemFile.events.HEALTH, TandemFile.health.HEALTHY, @health)
    if response.resync
      warn("Sync requesting resync")
      @engine.resync(Delta.makeDelta(response.head), response.version)
    else if @engine.remoteUpdate(response.delta, response.version)
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

  constructor: (@fileId, @adapter, initial = null) ->
    @id = _.uniqueId('file-')
    @health = TandemFile.health.WARNING
    initial or= { head: Delta.getInitial(''), version: 0 }
    initEngine.call(this, initial.head, initial.version)
    initListeners.call(this)

  broadcast: (route, packet, callback) =>
    packet = _.clone(packet)
    packet.type = route
    this.send(TandemFile.routes.BROADCAST, packet, callback)

  close: ->
    @adapter.close()
    @engine.removeAllListeners()

  isDirty: ->
    return !@engine.inFlight.isIdentity() or !@engine.inLine.isIdentity()

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
    @engine.transform(indexes)

  update: (delta) ->
    @engine.localUpdate(delta)


module.exports = TandemFile
