EventEmitter      = require('events').EventEmitter
TandemEmitter     = require('./emitter')
TandemFileManager = require('./file-manager')
TandemSocket      = require('./network/socket')


class TandemServer extends EventEmitter
  @events:
    ERROR  : 'tandem-error'
    JOIN   : 'file-join'
    LEAVE  : 'file-leave'
  events: TandemServer.events

  constructor: (server, options = {}) ->
    @fileManager = new TandemFileManager(this, options.storage, options)
    @network = new TandemSocket(server, @fileManager, options)
    @network.on(TandemSocket.events.CONNECT, (socket, fileId, userId, callback) =>
      @fileManager.find(fileId, (err, file) =>
        if err?
          callback(new Error('Error retrieving document'))
          TandemEmitter.emit(TandemEmitter.events.ERROR, err)
        else
          file.addClient(socket, userId)
          callback(null)
      )
    )
    TandemEmitter.on(TandemEmitter.events.ERROR, (args...) =>
      this.emit(TandemServer.events.ERROR, args...)
    )


module.exports = TandemServer
