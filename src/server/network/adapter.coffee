EventEmitter = require('events').EventEmitter
Tandem       = require('tandem-core')
TandemFile   = require('../file')


_makeResyncPacket = (file) ->
  return {
    resync  : true
    head    : file.getHead()
    version : file.getVersion()
  }

_onMessageError = (err, file, callback) ->
  err.fileId = file.id
  err.userId = userId
  TandemEmitter.emit(TandemEmitter.events.ERROR, err)
  callback(_makeResyncPacket(file))


class TandemNetworkAdapter extends EventEmitter
  @events:
    CONNECT : 'network-connect'
    ERROR   : 'network-error'

  constructor: ->

  initListeners: (sessionId, userId, file) ->
    this.listen(sessionId, TandemFile.routes.RESYNC, (packet, callback) =>
      callback(_makeResyncPacket(file))
    ).listen(sessionId, TandemFile.routes.SYNC, (packet, callback) =>
      file.sync(parseInt(packet.version), (err, delta, version) =>
        if err?
          _onMessageError(err, file, callback)
        else
          this.join(sessionId, file.id)
          callback(
            delta: delta
            version: version
          )
      )
    ).listen(sessionId, TandemFile.routes.UPDATE, (packet, callback) =>
      file.update(Tandem.Delta.makeDelta(packet.delta), parseInt(packet.version), (err, delta, version) =>
        if err?
          _onMessageError(err, file, callback)
        else 
          broadcastPacket =
            delta   : delta
            fileId  : file.id
            version : version
          broadcastPacket['userId'] = userId
          this.broadcast(sessionId, file.id, TandemFile.routes.UPDATE, broadcastPacket)
          file.lastUpdated = Date.now()
          callback(
            fileId  : file.id
            version : version
          )
      )
    ).listen(sessionId, TandemFile.routes.BROADCAST, (packet, callback) =>
      packet['userId'] = userId
      this.broadcast(sessionId, file.id, TandemFile.routes.BROADCAST, packet)
      callback({}) if callback?
    )

  addClient: (sessionId, userId, file) ->
    this.initListeners(sessionId, userId, file)

  broadcast: (sessionId, roomId, packet) ->
    console.warn "Should be overwritten by descendant"

  # Join room
  join: (fileId) ->
    console.warn "Should be overwritten by descendant"

  # Leave room
  leave: (fileId) ->
    console.warn "Should be overwritten by descendant"

  # Listen on room messages
  listen: (fileId, route, callback) ->
    console.warn "Should be overwritten by descendant"
    return this


module.exports = TandemNetworkAdapter
