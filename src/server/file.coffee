_                 = require('underscore')._
EventEmitter      = require('events').EventEmitter
Tandem            = require('tandem-core')
TandemEmitter     = require('./emitter')
TandemEngine      = require('./engine')
TandemMemoryCache = require('./cache/memory')


initSocketListeners = (socket, userId) ->
  _.each(TandemFile.routes, (route, name) ->
    socket.removeAllListeners(route)
  )
  socket.on(TandemFile.routes.RESYNC, (packet, callback) =>
    resync.call(this, callback)
  ).on(TandemFile.routes.SYNC, (packet, callback) =>
    sync.call(this, socket, userId, packet, callback)
  ).on(TandemFile.routes.UPDATE, (packet, callback) =>
    update.call(this, socket, userId, packet, callback)
  ).on(TandemFile.routes.BROADCAST, (packet, callback) =>
    packet['userId'] = userId
    socket.broadcast.to(@id).emit(TandemFile.routes.BROADCAST, packet)
    callback({}) if callback?
  ).on('disconnect', =>
    this.removeClient(socket, userId)
  )

resync = (callback) ->
  callback(
    resync  : true
    head    : @engine.head
    version : @engine.version
    users   : @users
  )

sync = (socket, userId, packet, callback) ->
  @engine.getDeltaSince(parseInt(packet.version), (err, delta, version, next) =>
    if err?
      err.fileId = @id
      err.userId = userId
      TandemEmitter.emit(TandemEmitter.events.ERROR, err)
      return resync.call(this, callback)
    socket.join(@id)
    callback(
      delta: delta
      users: @users
      version: version
    )
  )

update = (socket, userId, packet, callback) ->
  delta = Tandem.Delta.makeDelta(packet.delta)
  version = parseInt(packet.version)
  @engine.update(delta, version, (err, delta, version) =>
    if err?
      err.fileId = @id
      err.userId = userId
      TandemEmitter.emit(TandemEmitter.events.ERROR, err)
      return resync.call(this, callback)
    broadcastPacket =
      delta   : delta
      fileId  : @id
      version : version
    broadcastPacket['userId'] = userId
    socket.broadcast.to(@id).emit(TandemFile.routes.UPDATE, broadcastPacket)
    @lastUpdated = Date.now()
    callback(
      fileId  : @id
      version : version
    )
  )


class TandemFile extends EventEmitter
  @DEFAULTS:
    'cache': TandemMemoryCache

  @routes:
    BROADCAST : 'broadcast'
    JOIN      : 'user/join'
    LEAVE     : 'user/leave'
    RESYNC    : 'ot/resync'
    SYNC      : 'ot/sync'
    UPDATE    : 'ot/update'
  routes: TandemFile.routes

  constructor: (@server, @id, initial, version, options, callback) ->
    @settings = _.defaults(_.pick(options, _.keys(TandemFile.DEFAULTS)), TandemFile.DEFAULTS)
    @versionSaved = version
    @users = {}
    @cache = new @settings['cache'](@id)
    @engine = new TandemEngine(@cache, initial, version, (err, engine) =>
      @engine = engine
      callback(err, this)
    )
    @lastUpdated = Date.now()

  addClient: (socket, userId) ->
    socket.broadcast.to(@id).emit(TandemFile.routes.JOIN, userId)
    @server.emit(@server.events.JOIN, this, userId)
    @users[userId] ?= 0
    @users[userId] += 1
    initSocketListeners.call(this, socket, userId)

  close: (callback) ->
    @cache.del('history', callback)

  removeClient: (socket, userId) ->
    socket.broadcast.to(@id).emit(TandemFile.routes.LEAVE, userId) if userId?
    @server.emit(@server.events.LEAVE, this, userId)
    socket.leave(@id)
    @users[userId] -= 1 if @users[userId]?

  getHead: ->
    return @engine.head

  getHistory: (version, callback) ->
    @engine.getHistory(version, callback)

  getVersion: ->
    return @engine.version

  isDirty: ->
    return @engine.version != @versionSaved


module.exports = TandemFile
