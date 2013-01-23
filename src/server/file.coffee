Tandem       = require('../core')
TandemEngine = require('./engine')


resync = (callback) ->
  callback(
    head: @engine.head
    resync: true
    users: {}   # TODO Presence
    version: @engine.version
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
  if @engine.update(delta, version, (err, delta, version) ->
    broadcastPacket =
      delta: delta
      docId: metadata.docId
      version: version
    broadcastPacket['userId'] = metadata.user.id if metadata.user?.id?
    client.broadcast.emit(broadcastPacket)
    callback(
      docId: metadata.docId
      version: version
    )
  )
  else
    resync.call(this, callback)


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
