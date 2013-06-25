EventEmitter    = require('events').EventEmitter
Tandem          = require('tandem-core')
TandemEngine    = require('./engine')
TandemFile      = require('./file')
TandemNetwork   = require('./network')
TandemStorage   = require('./storage')


addClient = (client, metadata, callback) ->
  @storage.find(metadata.fileId, (err, file) =>
    return callback(err) if err?
    file.engine.on(TandemEngine.events.UPDATE, (delta, version) =>
      this.emit(TandemServer.events.UPDATE, file.id, delta, version)
    )
    file.on(TandemFile.events.ERROR, (err) =>
      this.emit(TandemServer.events.ERROR, err)
    )
    file.addClient(client, metadata, callback)
  )

removeClient = (client, callback) ->
  client.get('metadata', (err, metadata) =>
    return callback(err) if err?
    if metadata?.fileId?
      @storage.find(metadata.fileId, (err, file) =>
        return callback(err) if err?
        file.removeClient(client, callback)
      )
    else
      callback(null)
  )


class TandemServer extends EventEmitter
  @events:
    ERROR  : 'error'
    UPDATE : 'update'

  constructor: (server, options = {}) ->
    @storage = new TandemStorage(options.storage, options)
    @network = new TandemNetwork(server, @storage, options)
    @network.on(TandemNetwork.events.CONNECT, (client, metadata, callback) =>
      # By this point, client will be authenticated
      removeClient.call(this, client, =>
        addClient.call(this, client, metadata, (err) =>
          callback({ error: err })
        )
      )
    )


module.exports =
  Delta     : Tandem.Delta
  Op        : Tandem.Op
  InsertOp  : Tandem.InsertOp
  RetainOp  : Tandem.RetainOp

  Engine    : TandemEngine
  File      : TandemFile
  Network   : TandemNetwork
  Server    : TandemServer
  Storage   : TandemStorage
