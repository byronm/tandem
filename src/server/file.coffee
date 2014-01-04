_                 = require('underscore')._
EventEmitter      = require('events').EventEmitter
Tandem            = require('tandem-core')
TandemEmitter     = require('./emitter')
TandemEngine      = require('./engine')
TandemMemoryCache = require('./cache/memory')


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

  close: (callback) ->
    @cache.del('history', callback)

  getHead: ->
    return @engine.head

  getHistory: (version, callback) ->
    @engine.getHistory(version, callback)

  getVersion: ->
    return @engine.version

  isDirty: ->
    return @engine.version != @versionSaved

  resync: (callback) ->
    callback(
      resync  : true
      head    : @engine.head
      version : @engine.version
      users   : @users
    )

  sync: (socket, userId, packet, callback) ->
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

  update: (socket, userId, packet, callback) ->
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


module.exports = TandemFile
