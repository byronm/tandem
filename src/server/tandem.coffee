async           = require('async')
EventEmitter    = require('events').EventEmitter
Tandem          = require('tandem-core')
TandemEngine    = require('./engine')
TandemFile      = require('./file')
TandemNetwork   = require('./network')
TandemStorage   = require('./storage')


class TandemServer extends EventEmitter
  @events:
    ERROR  : 'tandem-error'

  constructor: (server, options = {}) ->
    @storage = new TandemStorage(options.storage, options)
    @network = new TandemNetwork(server, @storage, options)
    @network.on(TandemNetwork.events.CONNECT, (socket, fileId, userId, callback) =>
      @storage.find(fileId, (err, file) =>
        if err?
          callback(new Error('Error retrieving document'))
          this.emit(TandemServer.events.ERROR, err)
        else
          file.addClient(socket, userId)
          file.on(TandemFile.events.ERROR, (err) =>
            this.emit(TandemServer.events.ERROR, err)
          )
          callback(null)
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
