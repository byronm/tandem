_             = require('underscore')._
redis         = require('socket.io/node_modules/redis')
socketio      = require('socket.io')
EventEmitter  = require('events').EventEmitter
RedisStore    = require('socket.io/lib/stores/redis')

authenticate = (client, packet, callback) ->
  # Need to leave room
  if packet.fileId?
    @storage.checkAccess(packet.fileId, packet, (err, success) =>
      if !err? and success
        metadata = 
          fileId : packet.fileId
          user   : packet.user
        # Emit might be heard after callback is sent and client sends editor/sync
        client.once('newListener', =>
          callback({ error: [] })
        )
        this.emit(TandemNetwork.events.CONNECT, client, metadata)
      else
        callback({ error: ["Access denied"] })
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
    'store': 'memory'
    'transports': ['websocket', 'xhr-polling']

  @events:
    CONNECT: 'network-connect'

  constructor: (server, @storage, options = {}) ->
    options = _.pick(options, _.keys(TandemNetwork.DEFAULTS))
    @settings = _.extend({}, TandemNetwork.DEFAULTS, options)
    switch @settings['store']
      when 'memory'
        delete @settings['store']
      when 'redis'
        @settings['store'] = new RedisStore({
          redisPub    : redis.createClient()
          redisSub    : redis.createClient()
          redisClient : redis.createClient()
        })
    initNetwork.call(this, server)


module.exports = TandemNetwork
