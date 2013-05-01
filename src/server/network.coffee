_             = require('underscore')._
socketio      = require('socket.io')
EventEmitter  = require('events').EventEmitter


authenticate = (client, packet, callback) ->
  # Need to leave room
  if packet.fileId?
    @storage.checkAccess(packet.fileId, packet, (err, success) =>
      errors = if _.isArray(err) then err else []
      errors.push("Access denied") unless success
      if errors.length == 0
        metadata = 
          fileId : packet.fileId
          userId : packet.userId
        # Emit might be heard after callback is sent and client sends editor/sync
        client.once('newListener', =>
          callback({ error: [] })
        )
        this.emit(TandemNetwork.events.CONNECT, client, metadata)
      else
        callback({error: errors})
    )
  else
    callback({ error: ["Missing fileId"] })

initNetwork = (server) ->
  @io = socketio.listen(server)
  @io.configure( =>
    _.each(@settings, (value, key) =>
      @io.set(key, value)
    )
  )
  @io.configure('production', =>
    @io.enable('browser client minification')
    @io.enable('browser client etag')
  )
  @io.sockets.on('connection', (client) =>
    client.on('auth', (packet, callback) =>
      authenticate.call(this, client, packet, callback)
    )
  )


class TandemNetwork extends EventEmitter
  @DEFAULTS:
    'browser client': false
    'log level': 1
    'transports': ['websocket', 'xhr-polling']

  @events:
    CONNECT: 'network-connect'

  constructor: (server, @storage, options = {}) ->
    @settings = _.extend({}, TandemNetwork.DEFAULTS, _.pick(options, _.keys(TandemNetwork.DEFAULTS)))
    initNetwork.call(this, server)


module.exports = TandemNetwork
