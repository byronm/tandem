doSend = (route, packet, callback) ->
  this.addStat(TandemNetworkAdapter.SENT, route)
  @socket.emit(route, packet, (response) =>
    this.addStat(TandemNetworkAdapter.ACKED, route)
    console.info 'Callback:', response
    callback.call(this, response)
  )


class TandemNetworkAdapter
  @ACKED    : 'acked'
  @RECIEVED : 'recieved'
  @SENT     : 'sent'

  @DEFAULTS :
    'force new connection'      : true
    'max reconnection attempts' : Infinity
    'port'                      : 443
    'reconnection limit'        : 30000
    'secure'                    : true
    'sync disconnect on unload' : false


  constructor: (endpointUrl, @docId, @user, @authObj) ->
    @listeners = []
    @sendQueue = []
    @ready = false
    @stats = {}
    @options = _.clone(TandemNetworkAdapter.DEFAULTS)
    parts = endpointUrl.split(':')
    @host = parts[0]
    @options['port'] = parseInt(parts[1]) if parts.length > 1
    @socket = io.connect("https://#{@host}", @options)
    @socket.on('reconnecting', =>
      @ready = false
    ).on('reconnect', =>
      this.authenticate() if @ready == false
    )
    this.authenticate()

  addStat: (type, route) ->
    @stats[type] = {} unless @stats[type]?
    @stats[type][route] = 0  unless @stats[type][route]?
    @stats[type][route] += 1

  authenticate: ->
    authPacket =
      auth: @authObj
      docId: @docId
      user: @user
    @socket.emit('auth', authPacket, (response) =>
      if !response.error? || response.error.length == 0
        console.info "Connected!", response
        this.setReady() if this.ready == false
      else
        # TODO remove dependency on document
        $(document).trigger("notify", ["error", "Could not access this document.", Infinity])
    )

  close: ->
    _.each(@listeners, (callback, route) =>
      @socket.removeListener(route, callback)
    )

  on: (route, onCallback) ->
    callback = (packet) =>
      console.info "Got", route, packet
      this.addStat(TandemNetworkAdapter.RECIEVED, route)
      onCallback.call(this, packet) if onCallback?
    @socket.removeListener(route, callback) if @listeners[route]?
    @listeners[route] = callback
    @socket.addListener(route, callback)

  send: (route, packet, callback) ->
    if @ready
      console.info "Sending:", route, packet
      doSend.call(this, route, packet, callback)
    else
      console.info "Queued:", route, packet
      @sendQueue.push([route, packet, callback])

  setReady: ->
    async.until( =>
      return @sendQueue.length == 0
    , (callback) =>
      elem = @sendQueue.splice(0, 1)
      [route, packet, sendCallback] = elem[0]
      console.info "Sending from queue:", route, packet
      doSend.call(this, route, packet, sendCallback)
    , (err) => 
      @ready = true
    )



Tandem.NetworkAdapter = TandemNetworkAdapter
