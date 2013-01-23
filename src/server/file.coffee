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
  @engine.update(delta, version, (err, delta, version) ->
    return resync.call(this, callback) if err?
    broadcastPacket =
      delta: delta
      docId: metadata.docId
      version: version
    broadcastPacket['userId'] = metadata.user.id if metadata.user?.id?
    client.broadcast.emit('editor/update', broadcastPacket)
    callback(
      docId: metadata.docId
      version: version
    )
  )  


class TandemFile
  constructor: (@id, initial, version) ->
    @engine = new TandemEngine(initial, version)

  addClient: (client, metadata) ->
    client.join(metadata.docId)
    client.on('editor/resync', (packet, callback) =>
      resync.call(this, callback)
    )
    client.on('editor/sync', (packet, callback) =>
      sync.call(this, packet, callback)
    )
    client.on('editor/update', (packet, callback) =>
      update.call(this, client, metadata, packet, callback)
    )


module.exports = TandemFile
