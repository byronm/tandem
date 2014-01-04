_             = require('underscore')._
async         = require('async')
socketio      = require('socket.io')
EventEmitter  = require('events').EventEmitter


_authenticate = (client, packet, callback) ->
  async.waterfall([
    (callback) =>
      @fileManager.authorize(packet, callback)
    (callback) =>
      this.emit(TandemNetwork.events.CONNECT, client, packet.fileId, packet.userId, callback)
  ], (err) =>
    err = err.message if err? and _.isObject(err)   # Filter error info passed to front end client
    callback({ error: err })
  )

_initNetwork = (server) ->
  @io = socketio.listen(server, @settings)
  @io.configure('production', =>
    @io.enable('browser client minification')
    @io.enable('browser client etag')
  )
  @io.sockets.on('connection', (client) =>
    client.on('auth', (packet, callback) =>
      _authenticate.call(this, client, packet, callback)
    )
  )


class TandemNetwork extends EventEmitter
  @DEFAULTS:
    'browser client': false
    'log level': 1
    'transports': ['websocket', 'xhr-polling']

  @events:
    CONNECT : 'network-connect'
    ERROR   : 'network-error'
  events: TandemNetwork.events

  constructor: (tandemServer, httpServer, @fileManager, options = {}) ->
    @settings = _.defaults(_.pick(options, _.keys(TandemNetwork.DEFAULTS)), TandemNetwork.DEFAULTS)
    _initNetwork.call(this, httpServer)


module.exports = TandemNetwork
