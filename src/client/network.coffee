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
      console.log 'reconnecting'
      @ready = false
    ).on('reconnect', =>
      console.log 'reconnect'
      this.authenticate() if @ready == false
    ).on('connect', =>
      console.log 'connect'
    ).on('ready', =>
      console.log 'ready'
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
      console.log 'auth callback'
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
    callback = (args...) =>
      console.info "Got", route, args
      this.addStat(TandemNetworkAdapter.RECIEVED, route)
      onCallback.apply(this, args) if onCallback?
    @socket.removeListener(route, callback) if @listeners[route]?
    @listeners[route] = callback
    @socket.addListener(route, callback)

  send: (route, packet, callback) ->
    if @ready
      console.info "Sending:", route, packet
      this.addStat(TandemNetworkAdapter.SENT, route)
      @socket.emit(route, packet, (args...) =>
        this.addStat(TandemNetworkAdapter.ACKED, route)
        callback.apply(this, args)
      )
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
      this.addStat(TandemNetworkAdapter.SENT, route)
      @socket.emit(route, packet, (args...) =>
        this.addStat(TandemNetworkAdapter.ACKED, route)
        sendCallback.apply(this, args)
        callback()
      )
    , (err) => 
      @ready = true
    )



Tandem.NetworkAdapter = TandemNetworkAdapter
