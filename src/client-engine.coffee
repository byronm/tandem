class ClientEngine extends EventEmitter2
  @events:
    UPDATE: 'update'

  # constructor: (Delta, Number, function(Delta delta, Number version, function callback))
  constructor: (@arrived, @version, @sendFn) ->
    @inFlight = Tandem.Delta.getIdentity(@arrived.endLength)
    @inLine = Tandem.Delta.getIdentity(@arrived.endLength)

  checkSendReady: ->
    if @inFlight.isIdentity() and !@inLine.isIdentity()
      @inFlight = @inLine
      @inLine = Tandem.Delta.getIdentity(@inFlight.endLength)
      @sendFn(@inFlight, @version, =>
        @arrived = @arrived.compose(@inFlight)
        @inFlight = Tandem.Delta.getIdentity(@arrived.endLength)
        this.checkSendReady()
      )

  localUpdate: (delta) ->
    if @inLine.canCompose(delta)
      @inLine = @inLine.compose(delta)
      this.checkSendReady()
    else
      console.error('Cannot compose inLine with delta', @inLine, delta)

  remoteUpdate: (delta) ->
    flightDeltaFollows = delta.follows(@inFlight, false)
    textFollows = flightDeltaFollows.follows(@inLine, false)
    if @arrived.canCompose(delta)
      @arrived = @arrived.compose(delta)
      @inFlight = @inFlight.follows(delta, true)
      @inLine = @inLine.follows(flightDeltaFollows, true)
      this.emit(ClientEngine.events.UPDATE, textFollows)
    else
      console.error('Cannot compose inLine with delta', @inLine, delta)

  transform: (indexes) ->



Tandem.ClientEngine = ClientEngine
