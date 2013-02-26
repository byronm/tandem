_            = require('underscore')._
EventEmitter = require('events').EventEmitter
Tandem       = require('../core/tandem')


class TandemServerEngine extends EventEmitter
  @events:
    UPDATE: 'update'

  constructor: (@head, @version, @store, callback) ->
    @versionLoaded = @version
    callback(null, this)

  indexesToDelta: (indexes) ->

  getDeltaSince: (version, callback) ->
    return callback("Negative version") if version < 0
    return callback(null, @head, @version) if version == 0
    return callback(null, Tandem.Delta.getIdentity(@head.endLength), @version) if version == @version
    version -= @versionLoaded
    @store.range('history', version, (err, range) =>
      return callback("No version in history") if range.length == 0
      range = _.map(range, (delta) ->
        return Tandem.Delta.makeDelta(JSON.parse(delta))
      )
      firstHist = range.shift(range)
      delta = _.reduce(range, (delta, hist) ->
        return delta.follows(hist, true)
      , firstHist)
      return callback(null, delta, @version)
    )

  transform: (delta, version, callback) ->
    version -= @versionLoaded
    return "No version in history" if version < 0
    delta = this.indexesToDelta(delta) if _.isArray(delta)
    @store.range('history', version, (err, range) =>
      range = _.map(range, (delta) ->
        return Tandem.Delta.makeDelta(JSON.parse(delta))
      )
      delta = _.reduce(range, (delta, hist) ->
        return delta.follows(hist, true)
      , delta)
      return callback(null, delta, @version)
    )
    
  update: (delta, version, callback) ->
    this.transform(delta, version, (err, delta, version) =>
      return callback(err) if err?
      if @head.canCompose(delta)
        @head = @head.compose(delta)
        @store.push('history', JSON.stringify(delta), (err, length) =>
          @version += 1
          callback(null, delta, @version)
        )
      else
        callback("Cannot compose deltas")
    )


module.exports = TandemServerEngine
