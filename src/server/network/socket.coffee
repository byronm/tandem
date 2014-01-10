_             = require('lodash')._
async         = require('async')
socketio      = require('socket.io')
TandemAdapter = require('./adapter')


_authenticate = (client, packet, callback) ->
  async.waterfall([
    (callback) =>
      @storage.authorize(packet, callback)
    (callback) =>
      this.emit(TandemAdapter.events.CONNECT, client.id, packet.fileId, callback)
  ], (err) =>
    err = err.message if err? and _.isObject(err)   # Filter error info passed to front end client
    callback({ error: err })
  )


class TandemSocket extends TandemAdapter
  @DEFAULTS:
    'browser client': false
    'log level': 1
    'transports': ['websocket', 'xhr-polling']

  constructor: (httpServer, @storage, options = {}) ->
    @settings = _.defaults(_.pick(options, _.keys(TandemSocket.DEFAULTS)), TandemSocket.DEFAULTS)
    @sockets = {}
    @io = socketio.listen(httpServer, @settings)
    @io.configure('production', =>
      @io.enable('browser client minification')
      @io.enable('browser client etag')
    )
    @io.sockets.on('connection', (socket) =>
      @sockets[socket.id] = socket
      socket.on('auth', (packet, callback) =>
        _authenticate.call(this, socket, packet, callback)
      )
    )

  addClient: (sessionId, file) ->
    socket = @sockets[sessionId]
    _.each(TandemAdapter.routes, (route, name) ->
      socket.removeAllListeners(route)
    )
    socket.on('disconnect', =>
      this.removeClient(sessionId, file)
    )
    super

  broadcast: (sessionId, fileId, route, packet) ->
    socket = @sockets[sessionId]
    socket.broadcast.to(fileId).emit(route, packet)

  checkOpen: (fileId) ->
    return @io.sockets.clients(fileId).length > 0

  join: (sessionId, fileId) ->
    socket = @sockets[sessionId]
    socket.join(fileId)

  leave: (sessionId, fileId) ->
    socket = @sockets[sessionId]
    socket.leave(fileId)

  listen: (sessionId, route, callback) ->
    socket = @sockets[sessionId]
    socket.on(route, callback)
    return this

  removeClient: (sessionId, file) ->
    this.leave(sessionId, file.id)


module.exports = TandemSocket
