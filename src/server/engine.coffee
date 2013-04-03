_            = require('underscore')._
async        = require('async')
EventEmitter = require('events').EventEmitter
Tandem       = require('tandem-core')

atomic = (fn) ->
  async.until( =>
    @locked == false
  , (callback) ->
    setTimeout(callback, 100)
  , =>
    @locked = true
    fn( =>
      @locked = false
    )
  )

class TandemServerEngine extends EventEmitter
  @events:
    UPDATE: 'update'

  constructor: (@head, @version, @store, callback) ->
    @id = _.uniqueId('engine-')
    @locked = false
    atomic.call(this, (done) =>
      @store.get('versionLoaded', (err, versionLoaded) =>
        if err?
          callback(err)
          return done()
        if versionLoaded?
          @versionLoaded = parseInt(versionLoaded)
          @store.range('history', @version - @versionLoaded, (err, range) =>
            if err?
              callback(err)
              return done()
            _.each(range, (delta) =>
              delta = Tandem.Delta.makeDelta(JSON.parse(delta))
              @head = @head.compose(delta)
              @version += 1
            )
            callback(null, this)
            done()
          )
        else
          @versionLoaded = @version
          @store.set('versionLoaded', @version, (err) =>
            callback(err, this)
            done()
          )
      )
    )

  getDeltaSince: (version, callback) ->
    return callback("Negative version") if version < 0
    return callback(null, @head, @version) if version == 0
    return callback(null, Tandem.Delta.getIdentity(@head.endLength), @version) if version == @version
    version -= @versionLoaded
    @store.range('history', version, (err, range) =>
      return callback(err) if err?
      return callback("No version #{version + @versionLoaded} in history of [#{@versionLoaded} - #{@version}]") if range.length == 0
      range = _.map(range, (delta) ->
        return Tandem.Delta.makeDelta(JSON.parse(delta))
      )
      firstHist = range.shift(range)
      delta = _.reduce(range, (delta, hist) ->
        return delta.follows(hist, true)
      , firstHist)
      return callback(null, delta, @version)
    )

  indexesToDelta: (indexes) ->

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
    atomic.call(this, (done) =>
      this.transform(delta, version, (err, delta, version) =>
        if err?
          callback(err)
          return done()
        if @head.canCompose(delta)
          @head = @head.compose(delta)
          @store.push('history', JSON.stringify(delta), (err, length) =>
            @version += 1
            callback(null, delta, @version)
            this.emit(TandemServerEngine.events.UPDATE, delta, version)
            done()
          )
        else
          callback("Cannot compose deltas")
          done()
      )
    )


module.exports = TandemServerEngine
