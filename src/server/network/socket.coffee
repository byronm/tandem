_             = require('lodash')
async         = require('async')
socketio      = require('socket.io')
TandemAdapter = require('./adapter')
TandemEmitter = require('../emitter')


_authenticate = (socket, packet, callback) ->
  @storage.authorize(packet, (err) =>
    if err?
      err = err.message if _.isObject(err)
    else
      this.join(socket.id, packet.fileId)
    callback({ error: err })
  )


class TandemSocket extends TandemAdapter
  @DEFAULTS:
    'browser client': false
    'log level': 1
    'transports': ['websocket', 'xhr-polling']

  constructor: (httpServer, @fileManager, @storage, options = {}) ->
    super
    @files = {}
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

  join: (sessionId, fileId) ->
    socket = @sockets[sessionId]
    @files[sessionId] = fileId
    socket.on('disconnect', this.leave.bind(this, sessionId, fileId))
    _.each(TandemAdapter.routes, (route, name) =>
      socket.removeAllListeners(route)
      socket.on(route, (packet, callback) =>
        this.handle(route, @files[sessionId], packet, (err, callbackPacket, broadcastPacket) =>
          TandemEmitter.emit(TandemEmitter.events.ERROR, err) if err?
          callback(callbackPacket)
          socket.broadcast.to(fileId).emit(route, broadcastPacket) if broadcastPacket?
        )
      )
    )
    socket.join(fileId)

  leave: (sessionId, fileId) ->
    socket = @sockets[sessionId]
    socket.leave(fileId) if socket?
    delete @sockets[sessionId]
    delete @files[sessionId]


module.exports = TandemSocket
