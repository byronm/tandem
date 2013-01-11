addStat = (type, route) ->
  @stats[type] = {} unless @stats[type]?
  @stats[type][route] = 0  unless @stats[type][route]?
  @stats[type][route] += 1

authenticate = ->
  authPacket =
    auth: @authObj
    docId: @docId
    user: @user
  @socket.emit('auth', authPacket, (response) =>
    if !response.error? || response.error.length == 0
      console.info "Connected!", response
      setReady.call(this) if @ready == false
    else
      this.emit(TandemNetworkAdapter.events.ERROR, "Could not access document #{@docId}")
  )

doSend = (route, packet, callback) ->
  addStat.call(this, TandemNetworkAdapter.SENT, route)
  @socket.emit(route, packet, (response) =>
    addStat.call(this, TandemNetworkAdapter.ACKED, route)
    console.info 'Callback:', response
    callback.call(this, response)
  )

setReady = ->
  this.emit(TandemNetworkAdapter.events.READY)
  async.until( =>
    return @sendQueue.length == 0
  , (callback) =>
    elem = @sendQueue.shift()
    [route, packet, sendCallback] = elem
    console.info "Sending from queue:", route, packet
    doSend.call(this, route, packet, (args...) =>
      sendCallback.apply(this, args)
      callback()
    )
  , (err) =>
    @ready = true
  )


class TandemNetworkAdapter extends EventEmitter2
  @events:
    ERROR: 'adapter-error'
    READY: 'adapter-ready'

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
    @id = _.uniqueId('adapter-')
    @socketListeners = []
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
      authenticate.call(this) if @ready == false
    )
    authenticate.call(this)

  close: ->
    _.each(@socketListeners, (callback, route) =>
      @socket.removeListener(route, callback)
    )

  on: (route, callback) ->
    if _.indexOf(_.values(TandemNetworkAdapter.events), route) > -1
      super
    else
      onSocketCallback = (packet) =>
        console.info "Got", route, packet
        addStat.call(this, TandemNetworkAdapter.RECIEVED, route)
        callback.call(this, packet) if callback?
      @socket.removeListener(route, onSocketCallback) if @socketListeners[route]?
      @socketListeners[route] = onSocketCallback
      @socket.addListener(route, onSocketCallback)

  send: (route, packet, callback, priority = false) ->
    if @ready
      console.info "Sending:", route, packet
      doSend.call(this, route, packet, callback)
    else
      console.info "Queued:", route, packet
      if priority
        @sendQueue.unshift([route, packet, callback])
      else
        @sendQueue.push([route, packet, callback])



Tandem.NetworkAdapter = TandemNetworkAdapter
