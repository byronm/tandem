_                 = require('underscore')._
Tandem            = require('tandem-core')
TandemEngine      = require('./engine')
TandemMemoryStore = require('./stores/memory')


initClientListeners = (client, metadata) ->
  _.each(TandemFile.routes, (route, name) ->
    client.removeAllListeners(route)
  )
  client.on(TandemFile.routes.RESYNC, (packet, callback) =>
    resync.call(this, callback)
  ).on(TandemFile.routes.SYNC, (packet, callback) =>
    sync.call(this, packet, callback)
  ).on(TandemFile.routes.UPDATE, (packet, callback) =>
    update.call(this, client, metadata, packet, callback)
  ).on(TandemFile.routes.BROADCAST, (packet, callback) =>
    packet['userId'] = metadata.user.id if metadata.user?.id?
    client.broadcast.to(@id).emit(TandemFile.routes.BROADCAST, packet)
    callback({}) if callback?
  ).on('disconnect', =>
    this.removeClient(client)
  )

resync = (callback) ->
  callback(
    resync: true
    head: @engine.head
    version: @engine.version
    users: @users
  )

sync = (packet, callback) ->
  version = parseInt(packet.version)
  @engine.getDeltaSince(version, (err, delta, version, next) =>
    return resync.call(this, callback) if err?
    callback(
      delta: delta
      users: @users
      version: version
    )
  )

update = (client, metadata, packet, callback) ->
  delta = Tandem.Delta.makeDelta(packet.delta)
  version = parseInt(packet.version)
  @engine.update(delta, version, (err, delta, version) =>
    return resync.call(this, callback) if err?
    broadcastPacket =
      delta: delta
      fileId: @id
      version: version
    broadcastPacket['userId'] = metadata.user.id if metadata.user?.id?
    client.broadcast.to(@id).emit(TandemFile.routes.UPDATE, broadcastPacket)
    callback(
      fileId: @id
      version: version
    )
  )


class TandemFile
  @routes:
    BROADCAST : 'broadcast'
    JOIN      : 'user/join'
    LEAVE     : 'user/leave'
    RESYNC    : 'ot/resync'
    SYNC      : 'ot/sync'
    UPDATE    : 'ot/update'

  @DEFAULTS:
    'store': TandemMemoryStore

  constructor: (@id, initial, version, options, callback) ->   
    @settings = _.extend({}, TandemFile.DEFAULTS, _.pick(options, _.keys(TandemFile.DEFAULTS)))
    @versionSaved = version
    @users = {}
    store = new @settings['store'](@id, (store) =>
      @engine = new TandemEngine(initial, version, store, (err, engine) =>
        callback(err, this)
      )
    )

  addClient: (client, metadata, callback = ->) ->
    client.set('metadata', metadata, (err) =>
      client.join(metadata.fileId)
      if metadata.user?.id?
        client.broadcast.to(@id).emit(TandemFile.routes.JOIN, metadata.user)
        unless @users[metadata.user.id]?
          @users[metadata.user.id] = _.clone(metadata.user)
          @users[metadata.user.id].online = 0
        @users[metadata.user.id].online += 1
      initClientListeners.call(this, client, metadata)
      callback()
    )

  removeClient: (client, callback = ->) ->
    client.get('metadata', (err, metadata) =>
      if !err and metadata?
        client.broadcast.to(@id).emit(TandemFile.routes.LEAVE, metadata.user) if metadata.user?
        client.leave(metadata.fileId)
        if metadata.user?.id? and @users[metadata.user.id]?
          @users[metadata.user.id].online -= 1
          @users[metadata.user.id] = undefined if @users[metadata.user.id].online == 0
      callback()
    )

  getHead: ->
    return @engine.head

  getVersion: ->
    return @engine.version

  isDirty: ->
    return @engine.version != @versionSaved


module.exports = TandemFile
