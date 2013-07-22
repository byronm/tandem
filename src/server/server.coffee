EventEmitter    = require('events').EventEmitter
TandemNetwork   = require('./network')
TandemStorage   = require('./storage')


class TandemServer extends EventEmitter
  @events:
    ERROR  : 'tandem-error'
    JOIN   : 'file-join'
    LEAVE  : 'file-leave'
  events: TandemServer.events

  constructor: (server, options = {}) ->
    @storage = new TandemStorage(this, options.storage, options)
    @network = new TandemNetwork(this, server, @storage, options)
    @network.on(TandemNetwork.events.CONNECT, (socket, fileId, userId, callback) =>
      @storage.find(fileId, (err, file) =>
        if err?
          callback(new Error('Error retrieving document'))
          this.emit(TandemServer.events.ERROR, err)
        else
          file.addClient(socket, userId)
          callback(null)
      )
    )


module.exports = TandemServer
