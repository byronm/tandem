EventEmitter      = require('events').EventEmitter
TandemFileManager = require('./file-manager')
TandemNetwork     = require('./network')


class TandemServer extends EventEmitter
  @events:
    ERROR  : 'tandem-error'
    JOIN   : 'file-join'
    LEAVE  : 'file-leave'
  events: TandemServer.events

  constructor: (server, options = {}) ->
    @fileManager = new TandemFileManager(this, options.storage, options)
    @network = new TandemNetwork(this, server, @fileManager, options)
    @network.on(TandemNetwork.events.CONNECT, (socket, fileId, userId, callback) =>
      @fileManager.find(fileId, (err, file) =>
        if err?
          callback(new Error('Error retrieving document'))
          this.emit(TandemServer.events.ERROR, err)
        else
          file.addClient(socket, userId)
          callback(null)
      )
    )


module.exports = TandemServer
