checkAdapterError = (response, callback) ->
  if !response.error? or response.error.length == 0
    if response.resync
      this.resync()
    else
      callback.call(this, response)
  else
    this.emit(TandemFile.events.ERROR, response.error)
    this.resync()

initListeners = ->
  @adapter.on(TandemFile.routes.UPDATE, (packet) =>
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


class TandemFile extends EventEmitter2
  @events:
    ERROR   : 'file-error'
    HEALTH  : 'health'
    JOIN    : 'join'
    LEAVE   : 'leave'
    READY   : 'ready'
    UPDATE  : 'update'

  @routes:
    JOIN    : 'user/join'
    LEAVE   : 'user/leave'
    SYNC    : 'editor/sync'
    UPDATE  : 'editor/update'

  constructor: (@docId, @adapter, @engine) ->
    initListeners.call(this)
    @adapter.send(TandemFile.routes.SYNC, { version: @engine.version }, (response) =>
      checkAdapterError.call(this, response, (response) =>
        @engine.remoteUpdate(response.delta, response.version)
      )
    )

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
