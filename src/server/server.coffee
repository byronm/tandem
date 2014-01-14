_                 = require('lodash')
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
    @network = if _.isFunction(@settings.network) then new @settings.network(server, @fileManager, @storage, @settings) else @settings.network
    @network.on(TandemSocket.events.CONNECT, (sessionId, fileId) =>
      @network.join(sessionId, fileId)
    )
    TandemEmitter.on(TandemEmitter.events.ERROR, (args...) =>
      this.emit(TandemServer.events.ERROR, args...)
    )

  stop: (callback) ->
    @fileManager.stop(callback)


module.exports = TandemServer
