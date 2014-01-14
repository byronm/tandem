EventEmitter  = require('events').EventEmitter
Tandem        = require('tandem-core')


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
  # Descendants should listen on these message routes
  @routes:
    RESYNC    : 'ot/resync'
    SYNC      : 'ot/sync'
    UPDATE    : 'ot/update'

  constructor: (httpServer, @fileManager, @storage, options = {}) ->

  handle: (route, fileId, packet, callback) ->
    @fileManager.find(fileId, (err, file) =>
      return callback(err, { error: err }) if err?
      resyncHandler = (err, file, callback) ->
        callback(err, _makeResyncPacket(file))
      switch route
        when TandemNetworkAdapter.routes.RESYNC
          resyncHandler(null, file, callback)
        when TandemNetworkAdapter.routes.SYNC
          return resyncHandler(err, file, callback) if err?
          file.sync(parseInt(packet.version), (err, delta, version) =>
            callback(err, {
              delta: delta
              version: version
            })
          )
        when TandemNetworkAdapter.routes.UPDATE
          return resyncHandler(err, file, callback) if err?
          file.update(Tandem.Delta.makeDelta(packet.delta), parseInt(packet.version), (err, delta, version) =>
            callback(err, {
              fileId  : fileId
              version : version
            }, {
              delta   : delta
              fileId  : fileId
              version : version
            })
          )
        else
          callback(new Error('Unexpected network route'))
    )


module.exports = TandemNetworkAdapter
