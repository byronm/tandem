_             = require('lodash')
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

_getDeltaSince = (version, callback) ->
  return callback(new FileError("Negative version", this)) if version < 0
  return callback(null, @head, @version) if version == 0
  return callback(null, Tandem.Delta.getIdentity(@head.endLength), @version) if version == @version
  this.getHistory(version, (err, deltas) =>
    return callback(err) if err?
    return callback(new FileError("No version #{version} in history", this)) if deltas.length == 0
    firstHist = deltas.shift()
    delta = _.reduce(deltas, (delta, hist) ->
      return delta.compose(hist)
    , firstHist)
    return callback(null, delta, @version)
  )


class FileError extends Error
  constructor: (@message, file) ->
    @version = file.version
    @versionLoaded = file.versionLoaded
    @head =
      startLength : file.head?.startLength
      endLength   : file.head?.endLength
      opsLength   : file.head?.ops?.length 


class TandemFile extends EventEmitter
  @events:
    UPDATE: 'update'

  constructor: (@id, @head, @version, options, callback) ->
    @versionSaved = version
    @cache = if _.isFunction(options.cache) then new options.cache(@id) else options.cache
    @lastUpdated = Date.now()
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

  close: (callback) ->
    @cache.del('history', callback)

  getHistory: (version, callback) ->
    @cache.range('history', version - @versionLoaded, (err, range) =>
      return callback(err) if err?
      deltas = _.map(range, (changeset) ->
        return Tandem.Delta.makeDelta(JSON.parse(changeset).delta)
      )
      return callback(null, deltas)
    )

  isDirty: ->
    return @version != @versionSaved

  sync: (version, callback) ->
    _getDeltaSince.call(this, version, callback)

  transform: (delta, version, callback) ->
    return callback(new FileError("No version in history", this)) if version < @versionLoaded
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
            callback(new FileError('Cannot compose deltas', this))
        (length, callback) =>
          @head = @head.compose(changeset.delta)
          @version += 1
          callback(null)
      ], (err, delta, version) =>
        callback(err, changeset.delta, changeset.version)
        this.emit(TandemFile.events.UPDATE, changeset.delta, changeset.version)
        done()
      )
    )


module.exports = TandemFile
