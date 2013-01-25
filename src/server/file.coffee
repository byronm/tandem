_            = require('underscore')._
Tandem       = require('../core')
TandemEngine = require('./engine')


resync = (callback) ->
  callback(
    resync: true
    head: @engine.head
    version: @engine.version
    users: {}   # TODO Presence
  )

sync = (packet, callback) ->
  version = parseInt(packet.version)
  @engine.getDeltaSince(version, (err, delta, version, next) =>
    return resync.call(this, callback) if err?
    callback(
      delta: delta
      users: {}   # TODO Presence
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
      fileId: metadata.fileId
      version: version
    broadcastPacket['userId'] = metadata.user.id if metadata.user?.id?
    client.broadcast.emit(TandemFile.routes.UPDATE, broadcastPacket)
    callback(
      fileId: metadata.fileId
      version: version
    )
  )  


class TandemFile
  @routes:
    JOIN    : 'user/join'
    LEAVE   : 'user/leave'
    RESYNC  : 'ot/resync'
    SYNC    : 'ot/sync'
    UPDATE  : 'ot/update'

  constructor: (@id, initial, version) ->
    @versionSaved = version
    @engine = new TandemEngine(initial, version)

  addClient: (client, metadata) ->
    client.get('metadata', (err, oldMetadata) =>
      if !err and metadata?.fileId?
        client.broadcast.emit(TandemFile.routes.LEAVE, oldMetadata.user)
        client.leave(metadata.fileId)
      client.set('metadata', metadata, (err) =>
        client.join(metadata.fileId)
        client.broadcast.emit(TandemFile.routes.JOIN, metadata.user)
        _.each(TandemFile.routes, (route, name) ->
          client.removeAllListeners(route)
        )
        client.on(TandemFile.routes.RESYNC, (packet, callback) =>
          resync.call(this, callback)
        ).on(TandemFile.routes.SYNC, (packet, callback) =>
          sync.call(this, packet, callback)
        ).on(TandemFile.routes.UPDATE, (packet, callback) =>
          update.call(this, client, metadata, packet, callback)
        )
      )
    )

  getHead: ->
    return @engine.head

  getVersion: ->
    return @engine.version

  isDirty: ->
    return @engine.version != @versionSaved


module.exports = TandemFile
