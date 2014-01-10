_                 = require('lodash')._
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
    @network = if _.isFunction(@settings.network) then new @settings.network(server, @storage, @settings) else @settings.network
    @fileManager = new TandemFileManager(@network, @storage, @settings)
    @network.on(TandemSocket.events.CONNECT, (sessionId, fileId, callback) =>
      @fileManager.find(fileId, (err, file) =>
        if err?
          callback(new Error('Error retrieving document'))
          TandemEmitter.emit(TandemEmitter.events.ERROR, err)
        else
          @network.addClient(sessionId, file)
          callback(null)
      )
    )
    TandemEmitter.on(TandemEmitter.events.ERROR, (args...) =>
      this.emit(TandemServer.events.ERROR, args...)
    )

  stop: (callback) ->
    @fileManager.stop(callback)


module.exports = TandemServer
