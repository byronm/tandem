_            = require('underscore')._
EventEmitter = require('events').EventEmitter


class TandemServerEngine extends EventEmitter
  @events:
    UPDATE: 'update'

  constructor: (@head, @version) ->
    @history = []
    @versionLoaded = @version

  indexesToDelta: (indexes) ->

  getDeltaSince: (version, callback) ->
    return callback(null, @head, @version) if version == 0
    return callback(null, Tandem.Delta.getIdentity(@head.endLength), @version) if version == @version
    version -= @versionLoaded
    return callback("No version in history") if version < 0 or version >= @history.length
    delta = _.reduce(@history.slice(version + 1), (delta, hist) ->
      return delta.compose(hist)
    , @history[version])
    console.log delta, @version
    return callback(null, delta, @version)

  transform: (delta, version, callback) ->
    version -= @versionLoaded
    return "No version in history" if version < 0
    delta = this.indexesToDelta(delta) if _.isArray(delta)
    delta = _.reduce(@history.slice(version), (delta, hist) ->
      return delta.follows(hist, true)
    , delta)
    return callback(null, delta, @version)

  update: (delta, version, callback) ->
    this.transform(delta, version, (err, delta, version) =>
      return callback(err) if err?
      if @head.canCompose(delta)
        @head = @head.compose(delta)
        @history.push(delta)
        @version += 1
        callback(null, delta, @version)
      else
        callback("Cannot compose deltas")
    )


module.exports = TandemServerEngine
