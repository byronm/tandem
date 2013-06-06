_                 = require('underscore')._
async             = require('async')
EventEmitter      = require('events').EventEmitter
Tandem            = require('tandem-core')
TandemMemoryCache = require('./cache/memory')

_atomic = (fn) ->
  async.until( =>
    @locked == false
  , (callback) =>
    setTimeout(callback, 100)
  , =>
    @locked = true
    fn( =>
      @locked = false
    )
  )

_getHistory = (version, callback) ->
  @cache.range('history', version, (err, range) =>
    return callback(err) if err?
    deltas = _.map(range, (changeset) ->
      return Tandem.Delta.makeDelta(JSON.parse(changeset).delta)
    )
    return callback(null, deltas)
  )


class TandemServerEngine extends EventEmitter
  @DEFAULTS:
    'cache': TandemMemoryCache

  @events:
    UPDATE: 'update'

  constructor: (@head, @version, options, callback) ->
    @settings = _.defaults(_.pick(options, _.keys(TandemServerEngine.DEFAULTS)), TandemServerEngine.DEFAULTS)
    @id = _.uniqueId('engine-')
    @locked = false
    @versionLoaded = @version
    @cache = new @settings['cache'](@id, (@cache) =>
      _getHistory.call(this, 0, (err, deltas) =>
        unless err?
          _.each(deltas, (delta) =>
            @head = @head.compose(delta)
            @version += 1
          )
        callback(err, this)
      )
    )

  getDeltaSince: (version, callback) ->
    return callback("Negative version") if version < 0
    return callback(null, @head, @version) if version == 0
    return callback(null, Tandem.Delta.getIdentity(@head.endLength), @version) if version == @version
    _getHistory.call(this, version - @versionLoaded, (err, deltas) =>
      return callback(err) if err?
      return callback("No version #{version} in history of [#{@versionLoaded} - #{@version}]") if deltas.length == 0
      firstHist = deltas.shift()
      delta = _.reduce(deltas, (delta, hist) ->
        return delta.compose(hist)
      , firstHist)
      return callback(null, delta, @version)
    )

  transform: (delta, version, callback) ->
    version -= @versionLoaded
    return callback("No version in history") if version < 0
    _getHistory.call(this, version, (err, deltas) =>
      return callback(err) if err?
      delta = _.reduce(deltas, (delta, hist) ->
        return delta.follows(hist, true)
      , delta)
      return callback(null, delta, @version)
    )
    
  update: (delta, version, callback) ->
    changeset = {}
    _atomic.call(this, (done) =>
      async.waterfall([
        (callback) =>
          this.transform(delta, version, callback)
        (delta, version, callback) =>
          if @head.canCompose(delta)
            changeset = { delta: delta, version: @version + 1 }
            @cache.push('history', JSON.stringify(changeset), callback)
          else
            callback({ message: "Cannot compose deltas", head: @head, delta: delta })
        (length, callback) =>
          @head = @head.compose(changeset.delta)
          @version += 1
          callback(null)
      ], (err, delta, version) =>
        callback(err, changeset.delta, changeset.version)
        this.emit(TandemServerEngine.events.UPDATE, changeset.delta, changeset.version)
        done()
      )
    )


module.exports = TandemServerEngine
