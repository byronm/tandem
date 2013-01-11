class TandemFile extends EventEmitter2
  @events:
    ERROR   : 'error'
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
    this.initListeners()
    @adapter.send(TandemFile.routes.SYNC, { version: @engine.version }, (response) =>
      console.log 'sync callback', response
      if !response.error? or response.error.length == 0
        if response.resync
          console.log '2'
          console.log 'gotta resync'
        else
          console.log '1'
          @engine.remoteUpdate(response.delta, response.version)
        console.log 'synced'
      else
        console.log 'shit'
    )

  close: ->
    @adapter.close()

  getUsers: ->
    return []

  initListeners: ->
    @adapter.on(TandemFile.routes.UPDATE, (packet) =>
      @engine.remoteUpdate(packet.delta, packet.version)
    )
    @engine.on(Tandem.ClientEngine.events.UPDATE, (delta) =>
      this.emit(TandemFile.events.UPDATE, delta)
    )
    @engine.on(Tandem.ClientEngine.events.ERROR, (args) ->
      console.log 'TESTER'
      console.log engine, args
    )

  send: (route, packet, callback) ->
    @adapter.send(@docId, route, packet, (response) =>
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
  constructor: (@endpointUrl, @user) ->

  open: (docId, authObj, initial, version = 0) ->
    @adapter = new Tandem.NetworkAdapter(@endpointUrl, docId, @user, authObj)
    engine = new Tandem.ClientEngine(initial, version, (delta, version, callback) =>
      @adapter.send(TandemFile.routes.UPDATE, { delta: delta, version: version }, callback)
    )
    return new TandemFile(docId, @adapter, engine)



Tandem.Client = TandemClient
Tandem.File = TandemFile
