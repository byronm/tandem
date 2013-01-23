# TODO get rid of throw, return false? Also could use math not check all the time...
EventEmitter = require('events').EventEmitter


class TandemServerEngine extends EventEmitter
  @events:
    UPDATE: 'update'

  constructor: (@head, @version) ->
    @history = []
    @versionLoaded = @version

  indexesToDelta: (indexes) ->

  transform: (delta, version) ->
    delta = this.indexesToDelta(delta) if _.isArray(delta)
    while version < @version
      hist = @history[version - @versionLoaded]
      throw new Error("No version in history") unless hist?
      delta = delta.follows(hist, true)
      version += 1
    return delta

  update: (delta, version, callback) ->
    delta = this.transform(delta, version)
    if @head.canCompose(delta)
      @head = @head.compose(delta)
      @history.push(delta)
      @version += 1
      callback(null, delta, version)
    else
      callback("Cannot compose deltas")


module.exports = TandemServerEngine
