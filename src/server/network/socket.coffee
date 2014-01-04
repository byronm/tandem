_             = require('underscore')._
async         = require('async')
socketio      = require('socket.io')
EventEmitter  = require('events').EventEmitter
Tandem        = require('tandem-core')
TandemAdapter = require('./adapter')
TandemEmitter = require('../emitter')
TandemFile    = require('../file')


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

initSocketListeners = (file, socket, userId) ->
  _.each(TandemFile.routes, (route, name) ->
    socket.removeAllListeners(route)
  )
  socket.on(TandemFile.routes.RESYNC, (packet, callback) =>
    resync.call(this, file, callback)
  ).on(TandemFile.routes.SYNC, (packet, callback) =>
    file.sync(parseInt(packet.version), (err, delta, version) =>
      if err?
        err.fileId = file.id
        err.userId = userId
        TandemEmitter.emit(TandemEmitter.events.ERROR, err)
        return resync.call(this, file, callback)
      else
        socket.join(file.id)
        callback(
          delta: delta
          users: file.users
          version: version
        )
    )
  ).on(TandemFile.routes.UPDATE, (packet, callback) =>
    file.update(Tandem.Delta.makeDelta(packet.delta), parseInt(packet.version), (err, delta, version) =>
      if err?
        err.fileId = file.id
        err.userId = userId
        TandemEmitter.emit(TandemEmitter.events.ERROR, err)
        return resync.call(this, file, callback)
      else 
        broadcastPacket =
          delta   : delta
          fileId  : file.id
          version : version
        broadcastPacket['userId'] = userId
        socket.broadcast.to(file.id).emit(TandemFile.routes.UPDATE, broadcastPacket)
        file.lastUpdated = Date.now()
        callback(
          fileId  : file.id
          version : version
        )
    )
  ).on(TandemFile.routes.BROADCAST, (packet, callback) =>
    packet['userId'] = userId
    socket.broadcast.to(@id).emit(TandemFile.routes.BROADCAST, packet)
    callback({}) if callback?
  ).on('disconnect', =>
    this.removeClient(file, socket, userId)
  )

resync = (file, callback) ->
  callback(
    resync  : true
    head    : file.getHead()
    version : file.getVersion()
    users   : file.users
  )



class TandemSocket extends TandemAdapter
  @DEFAULTS:
    'browser client': false
    'log level': 1
    'transports': ['websocket', 'xhr-polling']

  constructor: (@tandemServer, httpServer, @fileManager, options = {}) ->
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

  addClient: (file, socket, userId) ->
    socket.broadcast.to(@id).emit(TandemFile.routes.JOIN, userId)
    @tandemServer.emit(@tandemServer.events.JOIN, this, userId)
    file.users[userId] ?= 0
    file.users[userId] += 1
    initSocketListeners.call(this, file, socket, userId)

  removeClient: (file, socket, userId) ->
    socket.broadcast.to(file.id).emit(TandemFile.routes.LEAVE, userId) if userId?
    @tandemServer.emit(@tandemServer.events.LEAVE, this, userId)
    socket.leave(file.id)
    file.users[userId] -= 1 if file.users[userId]?

  broadcast: (fileId, route, packet) ->

  send: (route, packet) ->


module.exports = TandemSocket
