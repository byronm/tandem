_             = require('lodash')
async         = require('async')
socketio      = require('socket.io')
TandemAdapter = require('./adapter')


_authenticate = (socket, packet, callback) ->
  async.waterfall([
    (callback) =>
      @storage.authorize(packet, callback)
    (callback) =>
      socket.join(packet.fileId)
      this.emit(TandemAdapter.events.CONNECT, socket.id, packet.fileId, callback)
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

  listen: (sessionId, route, callback) ->
    socket = @sockets[sessionId]
    socket.on(route, callback)
    return this

  removeClient: (sessionId, file) ->
    socket = @sockets[sessionId]
    socket.leave(file.id) if socket?
    delete @sockets[sessionId]


module.exports = TandemSocket
