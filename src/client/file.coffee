checkAdapterError = (response, callback) ->
  if !response.error? or response.error.length == 0
    if response.resync
      resync.call(this)
    else
      callback.call(this, response)
  else
    this.emit(TandemFile.events.ERROR, response.error)
    resync.call(this)

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
  console.log 'resync'

sync = ->
  @adapter.send(TandemFile.routes.SYNC, { version: @engine.version }, (response) =>
    checkAdapterError.call(this, response, (response) =>
      @engine.remoteUpdate(response.delta, response.version)
    )
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

  constructor: (@docId, @adapter, @engine) ->
    initListeners.call(this)

  close: ->
    @adapter.close()

  getUsers: ->
    return []

  send: (route, packet, callback) ->
    @adapter.send(@docId, route, packet, (response) =>
      checkAdapterError.call(this, response, callback)
    )

  transform: (indexes) ->
    @engine.transform(indexes)

  update: (delta) ->
    @engine.localUpdate(delta)


Tandem.File = TandemFile
