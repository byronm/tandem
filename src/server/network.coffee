authenticate = (packet, callback) ->
  if @@packet.docId? and @packet.user?
    Storage.checkAccess(@packet.docId, @packet, (err, success) =>
      if !err? and success
        client.join(@packet.docId)
        metadata = 
          docId  : @packet.docId
          user   : @packet.user
        # Presence stuff
        this.emit(TandemNetwork.events.CONNECT, client, metadata)
      else
        callback({ error: ["Access denied"] })
    )
  else
    callback({ error: ["Missing docId or user info"] })

initNetwork = (server) ->
  @io = socketio.listen(server)
  @io.configure( =>
    _.each(@settings, (value, key) =>
      @io.set(key, value)
    )
  )
  @io.configure('production', =>
    io.enable('browser client minification')
    io.enable('browser client etag')
  )
  @io.sockets.on('connection', (client) =>
    client.on('auth', (packet, callback) =>
      authenticate.call(this, packet, callback)
    )
  )


class TandemNetwork extends EventEmitter
  @DEFAULTS:
    'log level': 1
    'transports': ['websocket', 'xhr-polling']

  @events:
    CONNECT: 'network-connect'


  constuctor: (server, options) ->
    @settings = _.extend({}, TandemNetwork.DEFAULTS, options)
    initNetwork.call(this, server)
