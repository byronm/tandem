_             = require('underscore')._
async         = require('async')
EventEmitter  = require('events').EventEmitter
Tandem        = require('tandem-core')


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

_getLoadedVersion = (callback) ->
  @cache.range('history', 0, 1, (err, range) =>
    return callback(err) if err?
    if range.length > 0
      # -1 since in case of 1 history at version v, we apply delta to get to v, so without it, our version is v - 1
      callback(null, JSON.parse(range[0]).version - 1)
    else
      callback(null, -1)
  )


class EngineError extends Error
  constructor: (@message, engine) ->
    @version = engine.version
    @versionLoaded = engine.versionLoaded
    @head =
      startLength : engine.head?.startLength
      endLength   : engine.head?.endLength
      opsLength   : engine.head?.ops?.length 


class TandemServerEngine extends EventEmitter
  @events:
    UPDATE: 'update'

  constructor: (@cache, @head, @version, callback) ->
    @id = _.uniqueId('engine-')
    @locked = false
    async.waterfall([
      (callback) =>
        _getLoadedVersion.call(this, callback)
      (cacheVersion, callback) =>
        if cacheVersion == -1
          @versionLoaded = @version
          callback(null, [])
        else
          @versionLoaded = cacheVersion
          this.getHistory(@version, callback)
    ], (err, deltas) =>
      unless err?
        _.each(deltas, (delta) =>
          @head = @head.compose(delta)
          @version += 1
        )
      callback(err, this)
    )

  getDeltaSince: (version, callback) ->
    return callback(new EngineError("Negative version", this)) if version < 0
    return callback(null, @head, @version) if version == 0
    return callback(null, Tandem.Delta.getIdentity(@head.endLength), @version) if version == @version
    this.getHistory(version, (err, deltas) =>
      return callback(err) if err?
      return callback(new EngineError("No version #{version} in history", this)) if deltas.length == 0
      firstHist = deltas.shift()
      delta = _.reduce(deltas, (delta, hist) ->
        return delta.compose(hist)
      , firstHist)
      return callback(null, delta, @version)
    )

  getHistory: (version, callback) ->
    @cache.range('history', version - @versionLoaded, (err, range) =>
      return callback(err) if err?
      deltas = _.map(range, (changeset) ->
        return Tandem.Delta.makeDelta(JSON.parse(changeset).delta)
      )
      return callback(null, deltas)
    )

  transform: (delta, version, callback) ->
    return callback(new EngineError("No version in history", this)) if version < @versionLoaded
    this.getHistory(version, (err, deltas) =>
      return callback(err) if err?
      delta = _.reduce(deltas, (delta, hist) ->
        return delta.transform(hist, true)
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
            # Version in changeset means when delta in changeset is applied you are on this version
            changeset = { delta: delta, version: @version + 1 }
            @cache.push('history', JSON.stringify(changeset), callback)
          else
            callback(new EngineError('Cannot compose deltas', this))
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
