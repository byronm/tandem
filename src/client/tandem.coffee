class TandemFile extends EventEmitter2
  @events:
    ERROR   : 'error'
    HEALTH  : 'health'
    JOIN    : 'join'
    LEAVE   : 'leave'
    UPDATE  : 'update'

  @routes:
    JOIN    : 'user/join'
    LEAVE   : 'user/leave'
    SYNC    : 'editor/sync'
    UPDATE  : 'editor/update'

  constructor: (@docId, @adapter, @engine) ->
    @adapter.on(docId, TandemFile.routes.UPDATE, (packet) =>
      @engine.remoteUpdate(packet.delta, packet.version)
    )

  close: ->
    @adapter.close()

  getUsers: ->
    return []

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
  DEFAULTS:
    initial: null
    latency: 0
    version: 0

  constructor: (@endpointUrl, @user) ->

  open: (docId, authObj, options) ->
    @options = _.extend({}, TandemClient.DEFAULTS, options)
    options.initial = Tandem.Delta.getInitial("\n") unless options.initial?
    @adapter = new Tandem.NetworkAdapter(@endpointUrl, docId, @user, authObj)
    engine = new Tandem.ClientEngine(options.initial, options.version, (delta, version, callback) =>
      @adapter.send(docId, TandemFile.routes.UPDATE, { delta: delta, version: version }, callback)
    )
    return new TandemFile(docId, @adapter, engine)



Tandem.Client = TandemClient
Tandem.File = TandemFile
