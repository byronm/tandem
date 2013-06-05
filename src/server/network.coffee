_             = require('underscore')._
socketio      = require('socket.io')
EventEmitter  = require('events').EventEmitter


authenticate = (client, packet, callback) ->
  @storage.authorize(packet, (err) =>
    return callback({ error: err }) if err?
    metadata = 
      fileId : packet.fileId
      userId : packet.userId
    this.emit(TandemNetwork.events.CONNECT, client, metadata, callback)
  )

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
    @settings = _.defaults(_.pick(options, _.keys(TandemNetwork.DEFAULTS)), TandemNetwork.DEFAULTS)
    initNetwork.call(this, server)


module.exports = TandemNetwork
