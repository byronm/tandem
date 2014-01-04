_             = require('underscore')._
async         = require('async')
socketio      = require('socket.io')
EventEmitter  = require('events').EventEmitter
TandemAdapter = require('./adapter')


_authenticate = (client, packet, callback) ->
  async.waterfall([
    (callback) =>
      @fileManager.authorize(packet, callback)
    (callback) =>
      this.emit(TandemAdapter.events.CONNECT, client, packet.fileId, packet.userId, callback)
  ], (err) =>
    err = err.message if err? and _.isObject(err)   # Filter error info passed to front end client
    callback({ error: err })
  )


class TandemSocket extends TandemAdapter
  @DEFAULTS:
    'browser client': false
    'log level': 1
    'transports': ['websocket', 'xhr-polling']

  constructor: (httpServer, @fileManager, options = {}) ->
    @settings = _.defaults(_.pick(options, _.keys(TandemSocket.DEFAULTS)), TandemSocket.DEFAULTS)
    @io = socketio.listen(httpServer, @settings)
    @io.configure('production', =>
      @io.enable('browser client minification')
      @io.enable('browser client etag')
    )
    @io.sockets.on('connection', (client) =>
      client.on('auth', (packet, callback) =>
        _authenticate.call(this, client, packet, callback)
      )
    )

  broadcast: (fileId, route, packet) ->

  send: (route, packet) ->


module.exports = TandemSocket
