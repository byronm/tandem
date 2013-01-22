resync: (callback) ->
  callback(
    resync: true
    head: @engine.head
    version: @engine.version
    users: {}   # TODO Presence
  )

sync: (packet, callback) ->
  delta = Tandem.Delta.makeDelta(packet.delta)
  version = parseInt(packet.version)
  if engine.transform(delta, version, (delta, version) ->
    callback(
      delta: delta
      users: {}   # TODO Presence
      version: version
    )
  )
  else
    resync.call(this, file, client, metadata, packet, callback)

update: (client, metadata, packet, callback) ->
  delta = Tandem.Delta.makeDelta(packet.delta)
  version = parseInt(packet.version)
  if file.update(delta, version, (delta, version) ->
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
    resync.call(this, file, client, metadata, packet, callback)


class TandemFile
  constructor: (initial, version) ->
    @engine = new TandemEngine(initial, version)

  addClient: (client, metadata) ->
    client.on('editor/resync', (packet, callback) =>
      resync.call(callback)
    )
    client.on('editor/sync', (packet, callback) =>
      sync.call(packet, callback)
    )
    client.on('editor/update', (packet, callback) =>
      update.call(this, client, metadata, packet, callback)
    )
