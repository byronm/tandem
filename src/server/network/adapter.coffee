EventEmitter  = require('events').EventEmitter
Tandem        = require('tandem-core')
TandemEmitter = require('../emitter')


_makeResyncPacket = (file) ->
  return {
    resync  : true
    head    : file.head
    version : file.version
  }

_onMessageError = (err, sessionId, file, callback) ->
  err.fileId = file.id
  err.sessionId = sessionId
  TandemEmitter.emit(TandemEmitter.events.ERROR, err)
  callback(_makeResyncPacket(file))


class TandemNetworkAdapter
  @routes:
    RESYNC    : 'ot/resync'
    SYNC      : 'ot/sync'
    UPDATE    : 'ot/update'

  constructor: (httpServer, @fileManager, @storage, options = {}) ->

  initListeners: (sessionId, fileId) ->
    this.listen(sessionId, TandemNetworkAdapter.routes.RESYNC, (packet, callback) =>
      @fileManager.find(fileId, (err, file) =>
        callback(_makeResyncPacket(file))
      )
    ).listen(sessionId, TandemNetworkAdapter.routes.SYNC, (packet, callback) =>
      @fileManager.find(fileId, (err, file) =>
        if err?
          TandemEmitter.emit(TandemEmitter.events.ERROR, err) if err?
          callback({ error: 'Error retrieving document' })
          return
        file.sync(parseInt(packet.version), (err, delta, version) =>
          if err?
            _onMessageError(err, sessionId, file, callback)
          else
            callback(
              delta: delta
              version: version
            )
        )
      )
    ).listen(sessionId, TandemNetworkAdapter.routes.UPDATE, (packet, callback) =>
      @fileManager.find(fileId, (err, file) =>
        file.update(Tandem.Delta.makeDelta(packet.delta), parseInt(packet.version), (err, delta, version) =>
          if err?
            _onMessageError(err, sessionId, file, callback)
          else 
            broadcastPacket =
              delta   : delta
              fileId  : file.id
              version : version
            this.broadcast(sessionId, file.id, TandemNetworkAdapter.routes.UPDATE, broadcastPacket)
            callback(
              fileId  : file.id
              version : version
            )
        )
      )
    )

  join: (sessionId, fileId) ->
    this.initListeners(sessionId, fileId)

  broadcast: (sessionId, fileId, packet) ->
    console.warn "broadcast should be overwritten by descendant"

  checkOpen: (fileId) ->
    console.warn "checkOpen should be overwritten by descendant"

  # Listen on room messages
  listen: (fileId, route, callback) ->
    console.warn "listen should be overwritten by descendant"
    return this


module.exports = TandemNetworkAdapter
