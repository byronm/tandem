_             = require('underscore')._
socketio      = require('socket.io')
EventEmitter  = require('events').EventEmitter


authenticate = (client, packet, callback) ->
  # Need to leave room
  if packet.docId? and packet.user?
    @storage.checkAccess(packet.docId, packet, (err, success) =>
      if !err? and success
        client.join(packet.docId)
        metadata = 
          docId  : packet.docId
          user   : packet.user
        # Presence stuff
        this.emit(TandemNetwork.events.CONNECT, client, metadata)
        # Emit will be heard after callback is sent and client sends editor/sync
        client.once('newListener', ->
          callback({ error: [] })
        )
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
      authenticate.call(this, client, packet, callback)
    )
  )


class TandemNetwork extends EventEmitter
  @DEFAULTS:
    'log level': 1
    'transports': ['websocket', 'xhr-polling']

  @events:
    CONNECT: 'network-connect'


  constructor: (server, @storage, options) ->
    options = _.pick(options, _.keys(TandemNetwork.DEFAULTS))
    @settings = _.extend({}, TandemNetwork.DEFAULTS, options)
    initNetwork.call(this, server)


module.exports = TandemNetwork
