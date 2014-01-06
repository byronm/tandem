EventEmitter      = require('events').EventEmitter
TandemEmitter     = require('./emitter')
TandemFileManager = require('./file-manager')
TandemSocket      = require('./network/socket')


class TandemServer extends EventEmitter
  @events:
    ERROR  : 'tandem-error'
    JOIN   : 'file-join'
    LEAVE  : 'file-leave'

  constructor: (server, options = {}) ->
    @fileManager = new TandemFileManager(this, options.storage, options)
    @network = new TandemSocket(this, server, @fileManager, options)
    @network.on(TandemSocket.events.CONNECT, (sessionId, fileId, userId, callback) =>
      @fileManager.find(fileId, (err, file) =>
        if err?
          callback(new Error('Error retrieving document'))
          TandemEmitter.emit(TandemEmitter.events.ERROR, err)
        else
          @network.addClient(sessionId, userId, file)
          callback(null)
      )
    )
    TandemEmitter.on(TandemEmitter.events.ERROR, (args...) =>
      this.emit(TandemServer.events.ERROR, args...)
    )


module.exports = TandemServer
