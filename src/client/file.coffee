Delta = require('../core/delta')
TandemEngine = require('./engine')
TandemNetworkAdapter = require('./network')


checkAdapterError = (response, callback) ->
  if !response.error? or response.error.length == 0
    callback.call(this, response) if callback?
  else
    this.emit(TandemFile.events.ERROR, response.error)

initAdapterListeners = ->
  @adapter.on(TandemFile.routes.UPDATE, (packet) =>
    if packet.fileId != @fileId
      console.warn "Got update for other file", packet.fileId
    else
      unless @engine.remoteUpdate(packet.delta, packet.version)
        console.warn "Remote update failed, requesting resync"
        resync.call(this)
  ).on(TandemFile.routes.BROADCAST, (packet) =>
    type = packet.type
    packet = _.omit(packet, 'type')
    this.emit(type, packet)
  ).on(TandemFile.routes.JOIN, (packet) =>
    if @users[packet.id]?
      @users[packet.id].online += 1
    else
      @users[packet.id] = packet
      @users[packet.id].online = 1
      this.emit(TandemFile.events.JOIN, packet)
  ).on(TandemFile.routes.LEAVE, (packet) =>
    if @users[packet.id]?
      @users[packet.id].online -= 1
      if @users[packet.id].online == 0
        this.emit(TandemFile.events.LEAVE, packet)
        @users[packet.id] = undefined
  )

initEngine = (initial, version) ->
  @engine = new TandemEngine(initial, version, (delta, version, callback) =>
    sendUpdate.call(this, delta, version, callback)
  )

initEngineListeners = ->
  @engine.on(TandemEngine.events.UPDATE, (delta) =>
    this.emit(TandemFile.events.UPDATE, delta)
  ).on(TandemEngine.events.ERROR, (args...) =>
    this.emit(TandemFile.events.ERROR, this, args)
    console.warn "Engine error, attempting resync", @id, args
    resync.call(this)
  )

initHealthListeners = ->
  @adapter.on(TandemNetworkAdapter.events.READY, =>
    this.emit(TandemFile.events.HEALTH, @health, TandemFile.health.HEALTHY)
    sync.call(this)
  ).on(TandemNetworkAdapter.events.RECONNECT, (transport, attempts) =>
    sync.call(this)
  ).on(TandemNetworkAdapter.events.RECONNECTING, (timeout, attempts) =>
    this.emit(TandemFile.events.HEALTH, @health, TandemFile.health.ERROR) if attempts == 1
  ).on(TandemNetworkAdapter.events.DISCONNECT, =>
    this.emit(TandemFile.events.HEALTH, @health, TandemFile.health.ERROR)
  ).on(TandemNetworkAdapter.events.ERROR, (args...) =>
    this.emit(TandemFile.events.ERROR, this, args)
    this.emit(TandemFile.events.HEALTH, @health, TandemFile.health.ERROR)
  )
  this.on(TandemFile.events.HEALTH, (oldHealth, newHealth) =>
    @health = newHealth
  )

initListeners = ->
  initAdapterListeners.call(this)
  initEngineListeners.call(this)
  initHealthListeners.call(this)

resync = (callback) ->
  this.emit(TandemFile.events.HEALTH, @health, TandemFile.health.WARNING)
  this.send(TandemFile.routes.RESYNC, {}, (response) =>
    @engine.resync(Delta.makeDelta(response.head), response.version)
    this.emit(TandemFile.events.HEALTH, @health, TandemFile.health.HEALTHY)
    callback() if callback?
  )

sendUpdate = (delta, version, callback) ->
  packet = { delta: delta, version: version }
  this.send(TandemFile.routes.UPDATE, packet, (response) =>
    if response.resync
      console.warn "Update requesting resync", @id, packet, response
      delta = Delta.makeDelta(response.head)
      @engine.resync(delta, response.version)
      sendUpdate.call(this, @engine.inFlight, @engine.version, callback)
    else
      callback.call(this, response)
  )

setReady = ->
  # Need to resend before emitting ready
  # Otherwise listeners on ready might immediate send an update and thus resendUpdate will duplicate packet
  @engine.resendUpdate()
  this.emit(TandemFile.events.READY)

sync = ->
  this.emit(TandemFile.events.HEALTH, @health, TandemFile.health.HEALTHY)
  this.send(TandemFile.routes.SYNC, { version: @engine.version }, (response) =>
    @users = response.users
    if response.resync
      console.warn "Sync requesting resync"
      @engine.resync(Delta.makeDelta(response.head), response.version)
    else
      unless @engine.remoteUpdate(response.delta, response.version)
        console.warn "Remote update failed on sync, requesting resync"
        return resync.call(this, =>
          setReady.call(this)
        )
    setReady.call(this)
  , true)


class TandemFile extends EventEmitter2
  @events:
    ERROR   : 'file-error'
    HEALTH  : 'file-health'
    JOIN    : 'file-join'
    LEAVE   : 'file-leave'
    READY   : 'file-ready'
    UPDATE  : 'file-update'

  @health:
    HEALTHY : 'healthy' 
    WARNING : 'warning'
    ERROR   : 'error'

  @routes:
    BROADCAST : 'broadcast'
    JOIN      : 'user/join'
    LEAVE     : 'user/leave'
    RESYNC    : 'ot/resync'
    SYNC      : 'ot/sync'
    UPDATE    : 'ot/update'

  constructor: (@fileId, @adapter, initial, version = 0) ->
    @id = _.uniqueId('file-')
    @health = TandemFile.health.WARNING
    @users = {}
    initial or= Delta.getInitial('')
    initEngine.call(this, initial, version)
    initListeners.call(this)

  broadcast: (route, packet, callback) =>
    packet = _.clone(packet)
    packet.type = route
    this.send(TandemFile.routes.BROADCAST, packet, callback)

  close: ->
    @adapter.removeAllListeners()
    @engine.removeAllListeners()

  getUsers: ->
    return @users

  isDirty: ->
    return !@engine.inFlight.isIdentity() or !@engine.inLine.isIdentity()

  send: (route, packet, callback = null, priority = false) ->
    if callback?
      @adapter.send(route, packet, (response) =>
        checkAdapterError.call(this, response, callback)
      , priority)
    else
      @adapter.send(route, packet)

  transform: (indexes) ->
    @engine.transform(indexes)

  update: (delta) ->
    @engine.localUpdate(delta)


module.exports = TandemFile
