checkAdapterError = (response, callback) ->
  if !response.error? or response.error.length == 0
    callback.call(this, response)
  else
    this.emit(TandemFile.events.ERROR, response.error)

initEngine = (initial, version) ->
  @engine = new Tandem.ClientEngine(initial, version, (delta, version, callback) =>
    sendUpdate.call(this, delta, version, callback)
  )

initListeners = ->
  @adapter.on(Tandem.NetworkAdapter.events.READY, =>
    sync.call(this)
  ).on(TandemFile.routes.UPDATE, (packet) =>
    @engine.remoteUpdate(packet.delta, packet.version)
  ).on(Tandem.NetworkAdapter.events.ERROR, (args...) =>
    this.emit(TandemFile.events.ERROR, this, args)
  )
  @engine.on(Tandem.ClientEngine.events.UPDATE, (delta) =>
    this.emit(TandemFile.events.UPDATE, delta)
  ).on(Tandem.ClientEngine.events.ERROR, (args...) =>
    this.emit(TandemFile.events.ERROR, this, args)
  )

resync = ->
  this.emit(TandemFile.events.HEALTH, @health, TandemFile.health.WARNING)
  this.send(TandemFile.routes.RESYNC, {}, (response) =>
    delta = Tandem.Delta.makeDelta(response.head)
    @engine.resync(delta, response.version)
    this.emit(TandemFile.events.HEALTH, @health, TandemFile.health.HEALTHY)
  )

sendUpdate = (delta, version, callback) ->
  this.send(Tandem.File.routes.UPDATE, { delta: delta, version: version }, (response) =>
    if response.resync
      delta = Tandem.Delta.makeDelta(response.head)
      @engine.resync(delta, response.version)
      sendUpdate.call(this, @engine.inFlight, @engine.version, callback)
    else
      callback.call(this, response)
  )

sync = ->
  this.send(TandemFile.routes.SYNC, { version: @engine.version }, (response) =>
    if response.resync
      resync.call(this)
    else
      @engine.remoteUpdate(response.delta, response.version)
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
    JOIN    : 'user/join'
    LEAVE   : 'user/leave'
    RESYNC  : 'editor/resync'
    SYNC    : 'editor/sync'
    UPDATE  : 'editor/update'

  constructor: (@docId, @adapter, initial, version) ->
    initEngine.call(this, initial, version)
    initListeners.call(this)

  close: ->
    @adapter.close()

  getUsers: ->
    return []

  send: (route, packet, callback, priority = false) ->
    @adapter.send(route, packet, (response) =>
      checkAdapterError.call(this, response, callback)
    , priority)

  transform: (indexes) ->
    @engine.transform(indexes)

  update: (delta) ->
    @engine.localUpdate(delta)


Tandem.File = TandemFile
