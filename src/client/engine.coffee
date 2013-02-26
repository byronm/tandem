Delta = require('../core/delta')


send = ->
  @sendFn(@inFlight, @version, (response) =>
    @version = response.version
    @arrived = @arrived.compose(@inFlight)
    @inFlight = Delta.getIdentity(@arrived.endLength)
    sendIfReady.call(this)
  )

sendIfReady = ->
  if @inFlight.isIdentity() and !@inLine.isIdentity()
    @inFlight = @inLine
    @inLine = Delta.getIdentity(@inFlight.endLength)
    send.call(this)


class ClientEngine extends EventEmitter2
  @events:
    ERROR  : 'engine-error'
    UPDATE : 'engine-update'

  # constructor: (Delta, Number, function(Delta delta, Number version, function callback))
  constructor: (@arrived, @version, @sendFn) ->
    @id = _.uniqueId('engine-')
    @inFlight = Delta.getIdentity(@arrived.endLength)
    @inLine = Delta.getIdentity(@arrived.endLength)

  localUpdate: (delta) ->
    if @inLine.canCompose(delta)
      @inLine = @inLine.compose(delta)
      sendIfReady.call(this)
    else
      this.emit(ClientEngine.events.ERROR, 'Cannot compose inLine with local delta', @inLine, delta)

  remoteUpdate: (delta, @version) ->
    delta = Delta.makeDelta(delta)
    if @arrived.canCompose(delta)
      @arrived = @arrived.compose(delta)
      flightDeltaFollows = delta.follows(@inFlight, false)
      textFollows = flightDeltaFollows.follows(@inLine, false)
      @inFlight = @inFlight.follows(delta, true)
      @inLine = @inLine.follows(flightDeltaFollows, true)
      this.emit(ClientEngine.events.UPDATE, textFollows)
      return true
    else
      return false

  resendUpdate: ->
    send.call(this) unless @inFlight.isIdentity()

  resync: (delta, version) ->
    decomposed = delta.decompose(@arrived)
    this.remoteUpdate(decomposed, version)

  transform: (indexes) ->


module.exports = ClientEngine
