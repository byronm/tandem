class TandemFile extends EventEmitter2
  @events:
    ERROR   : 'error'
    HEALTH  : 'health'
    JOIN    : 'join'
    LEAVE   : 'leave'
    UPDATE  : 'update'

  @routes
    JOIN    : 'user/join'
    LEAVE   : 'user/leave'
    SYNC    : 'editor/sync'
    UPDATE  : 'editor/update'

  constructor: (fileId, @adapter, @engine) ->
    @adapter.on(TandemFile.routes.UPDATE, (packet) =>
      @engine.remoteUpdate(packet.delta, packet.version)
    )

  close: ->

  getUsers: ->
    return []

  send: (type, packet, callback) ->
    @adapter.emit(route, packet, (response) =>
      if response.error and response.error.length > 0
        this.emit(TandemFile.events.ERROR, response.error.join('. '))
      else
        callback(response)
    )

  transform: (indexes) ->
    @engine.transform(indexes)

  update: (delta) ->
    @engine.localUpdate(delta)



class TandemClient
  constructor: (endpointUrl) ->
    @network = new Tandem.Network(endpointUrl)

  open: (fileId, authObj, initial = null, version = 0) ->
    adapter = @network.open(fileId, authObj)
    initial = Tandem.Delta.getInitial("") unless initial?
    engine = new Tandem.ClientEngine(initial, version, (delta, version, callback) =>
      adapter.send(TandemFile.routes.UPDATE, { delta: delta, version: version }, callback)
    )
    return new TandemFile(fileId, adapter, engine)



Tandem.Client = TandemClient
Tandem.File = TandemFile
