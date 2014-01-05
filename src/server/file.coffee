_                 = require('underscore')._
EventEmitter      = require('events').EventEmitter
TandemEmitter     = require('./emitter')
TandemEngine      = require('./engine')
TandemMemoryCache = require('./cache/memory')


class TandemFile extends EventEmitter
  @DEFAULTS:
    'cache': TandemMemoryCache

  @routes:
    BROADCAST : 'broadcast'
    JOIN      : 'user/join'
    LEAVE     : 'user/leave'
    RESYNC    : 'ot/resync'
    SYNC      : 'ot/sync'
    UPDATE    : 'ot/update'

  constructor: (@server, @id, initial, version, options, callback) ->
    @settings = _.defaults(_.pick(options, _.keys(TandemFile.DEFAULTS)), TandemFile.DEFAULTS)
    @versionSaved = version
    @users = {}
    @cache = new @settings['cache'](@id)
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
