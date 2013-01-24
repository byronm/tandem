_             = require('underscore')._
socketio      = require('socket.io')
EventEmitter  = require('events').EventEmitter


authenticate = (client, packet, callback) ->
  # Need to leave room
  if packet.fileId? and packet.user?
    @storage.checkAccess(packet.fileId, packet, (err, success) =>
      if !err? and success
        client.get('metadata', (err, metadata) =>
          client.leave(metadata.fileId) if !err and metadata?.fileId?
          client.join(packet.fileId)
          metadata = 
            fileId  : packet.fileId
            user   : packet.user
          client.set('metadata', metadata, =>
            # Presence stuff
            # Emit might be heard after callback is sent and client sends editor/sync
            client.once('newListener', =>
              callback({ error: [] })
            )
            this.emit(TandemNetwork.events.CONNECT, client, metadata)
          )
        )
      else
        callback({ error: ["Access denied"] })
    )
  else
    callback({ error: ["Missing fileId or user info"] })

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

  constructor: (server, @storage, options = {}) ->
    options = _.pick(options, _.keys(TandemNetwork.DEFAULTS))
    @settings = _.extend({}, TandemNetwork.DEFAULTS, options)
    initNetwork.call(this, server)


module.exports = TandemNetwork
