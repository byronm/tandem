checkSendReady = ->
  if @inFlight.isIdentity() and !@inLine.isIdentity()
    @inFlight = @inLine
    @inLine = Tandem.Delta.getIdentity(@inFlight.endLength)
    @sendFn(@inFlight, @version, (response) =>
      @version = response.version
      @arrived = @arrived.compose(@inFlight)
      @inFlight = Tandem.Delta.getIdentity(@arrived.endLength)
      checkSendReady.call(this)
    )


class ClientEngine extends EventEmitter2
  @events:
    ERROR  : 'engine-error'
    UPDATE : 'engine-update'

  # constructor: (Delta, Number, function(Delta delta, Number version, function callback))
  constructor: (@arrived, @version, @sendFn) ->
    @id = _.uniqueId('engine-')
    @inFlight = Tandem.Delta.getIdentity(@arrived.endLength)
    @inLine = Tandem.Delta.getIdentity(@arrived.endLength)

  localUpdate: (delta) ->
    if @inLine.canCompose(delta)
      @inLine = @inLine.compose(delta)
      checkSendReady.call(this)
    else
      this.emit(ClientEngine.events.ERROR, 'Cannot compose inLine with local delta', @inLine, delta)

  remoteUpdate: (delta, @version) ->
    delta = Tandem.Delta.makeDelta(delta)
    flightDeltaFollows = delta.follows(@inFlight, false)
    textFollows = flightDeltaFollows.follows(@inLine, false)
    if @arrived.canCompose(delta)
      @arrived = @arrived.compose(delta)
      @inFlight = @inFlight.follows(delta, true)
      @inLine = @inLine.follows(flightDeltaFollows, true)
      this.emit(ClientEngine.events.UPDATE, textFollows)
    else
      this.emit(ClientEngine.events.ERROR, 'Cannot compose inLine with remote delta', @inLine, delta)

  transform: (indexes) ->




Tandem.ClientEngine = ClientEngine
