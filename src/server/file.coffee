_                 = require('underscore')._
Tandem            = require('tandem-core')
TandemEngine      = require('./engine')


initClientListeners = (client, metadata) ->
  _.each(TandemFile.routes, (route, name) ->
    client.removeAllListeners(route)
  )
  client.on(TandemFile.routes.RESYNC, (packet, callback) =>
    resync.call(this, callback)
  ).on(TandemFile.routes.SYNC, (packet, callback) =>
    sync.call(this, client, packet, callback)
  ).on(TandemFile.routes.UPDATE, (packet, callback) =>
    update.call(this, client, metadata, packet, callback)
  ).on(TandemFile.routes.BROADCAST, (packet, callback) =>
    packet['userId'] = metadata.userId if metadata.userId
    client.broadcast.to(@id).emit(TandemFile.routes.BROADCAST, packet)
    callback({}) if callback?
  ).on('disconnect', =>
    this.removeClient(client)
  )

resync = (callback) ->
  callback(
    resync  : true
    head    : @engine.head
    version : @engine.version
    users   : @users
  )

sync = (client, packet, callback) ->
  @engine.getDeltaSince(parseInt(packet.version), (err, delta, version, next) =>
    if err?
      console.error(err)
      return resync.call(this, callback)
    client.get('metadata', (err, metadata) =>
      client.join(metadata.fileId) unless err?
      callback(
        delta: delta
        users: @users
        version: version
      )
    )
  )

update = (client, metadata, packet, callback) ->
  delta = Tandem.Delta.makeDelta(packet.delta)
  version = parseInt(packet.version)
  @engine.update(delta, version, (err, delta, version) =>
    if err?
      console.error(err)
      return resync.call(this, callback)
    broadcastPacket =
      delta   : delta
      fileId  : @id
      version : version
    broadcastPacket['userId'] = metadata.userId
    client.broadcast.to(@id).emit(TandemFile.routes.UPDATE, broadcastPacket)
    callback(
      fileId  : @id
      version : version
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

  constructor: (@id, initial, version, options, callback) ->   
    @versionSaved = version
    @users = {}
    @engine = new TandemEngine(initial, version, options, (err, engine) =>
      @engine = engine
      callback(err, this)
    )

  addClient: (client, metadata, callback = ->) ->
    client.set('metadata', metadata, (err) =>
      if metadata.userId?
        client.broadcast.to(@id).emit(TandemFile.routes.JOIN, metadata.userId)
        @users[metadata.userId] = 0 unless @users[metadata.userId]?
        @users[metadata.userId] += 1
      initClientListeners.call(this, client, metadata)
      callback()
    )

  removeClient: (client, callback = ->) ->
    client.get('metadata', (err, metadata) =>
      if !err and metadata?
        client.broadcast.to(@id).emit(TandemFile.routes.LEAVE, metadata.userId) if metadata.userId?
        client.leave(metadata.fileId)
        if metadata.userId? and @users[metadata.userId]?
          @users[metadata.userId] -= 1
          delete @users[metadata.userId] if @users[metadata.userId] == 0
      callback()
    )

  getHead: ->
    return @engine.head

  getVersion: ->
    return @engine.version

  isDirty: ->
    return @engine.version != @versionSaved


module.exports = TandemFile
