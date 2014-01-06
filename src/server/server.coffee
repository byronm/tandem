EventEmitter      = require('events').EventEmitter
TandemEmitter     = require('./emitter')
TandemFileManager = require('./file-manager')
TandemMemoryCache = require('./cache/memory')
TandemSocket      = require('./network/socket')
TandemStorage     = require('./storage')


class TandemServer extends EventEmitter
  @events:
    ERROR  : 'tandem-error'
  @DEFAULTS:
    cache   : TandemMemoryCache
    network : TandemSocket
    storage : TandemStorage

  constructor: (server, options = {}) ->
    @settings = _.defaults(options, TandemServer.DEFAULTS)
    @storage = if _.isFunction(@settings.storage) then new @settings.storage else @settings.storage
    @fileManager = new TandemFileManager(@storage, @settings)
    @network = if _.isFunction(@settings.network) then new @settings.network(server, @fileManager, @settings) else @settings.network
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
