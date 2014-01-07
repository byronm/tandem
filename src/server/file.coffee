_                 = require('underscore')._
EventEmitter      = require('events').EventEmitter
TandemEmitter     = require('./emitter')
TandemEngine      = require('./engine')


class TandemFile extends EventEmitter
  @routes:
    BROADCAST : 'broadcast'
    RESYNC    : 'ot/resync'
    SYNC      : 'ot/sync'
    UPDATE    : 'ot/update'

  constructor: (@id, initial, version, options, callback) ->
    @versionSaved = version
    @cache = if _.isFunction(options.cache) then new options.cache(@id) else options.cache
    @engine = new TandemEngine(@cache, initial, version, (err, engine) =>
      @engine = engine
      callback(err, this)
    )
    @lastUpdated = Date.now()

  close: (callback) ->
    @cache.del('history', callback)

  getHead: ->
    return @engine.head

  getHistory: (version, callback) ->
    @engine.getHistory(version, callback)

  getVersion: ->
    return @engine.version

  isDirty: ->
    return @engine.version != @versionSaved

  sync: (version, callback) ->
    @engine.getDeltaSince(version, callback)

  update: (clientDelta, clientVersion, callback) ->
    @engine.update(clientDelta, clientVersion, callback)


module.exports = TandemFile
