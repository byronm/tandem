authenticate = ->
  authPacket =
    auth: @authObj
    fileId: @fileId
    user: @user
  console.info "Attempting auth to", @fileId
  @socket.emit('auth', authPacket, (response) =>
    if !response.error? || response.error.length == 0
      console.info "Connected!", response
      setReady.call(this) if @ready == false
    else
      this.emit(TandemNetworkAdapter.events.ERROR, "Could not access document #{@fileId}")
  )

doSend = (route, packet, callback) ->
  track.call(this, TandemNetworkAdapter.SEND, route, packet)
  setTimeout( => 
    @socket.emit(route, packet, (response) =>
      track.call(this, TandemNetworkAdapter.CALLBACK, route, response)
      console.info 'Callback:', response
      callback.call(this, response)
    )
  , TandemNetworkAdapter.latency)

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

track = (type, route, packet) ->
  @stats[type] = {} unless @stats[type]?
  @stats[type][route] = 0  unless @stats[type][route]?
  @stats[type][route] += 1
  historyObj = {}
  historyObj["#{type}: #{route}"] = packet
  @history.push(historyObj)



class TandemNetworkAdapter extends EventEmitter2
  @events:
    DISCONNECT   : 'disconnect'
    ERROR        : 'adapter-error'
    READY        : 'adapter-ready'
    RECONNECT    : 'reconnect'
    RECONNECTING : 'reconnecting'

  @CALLBACK : 'callback'
  @RECIEVE  : 'recieve'
  @SEND     : 'send'

  @DEFAULTS :
    'force new connection'      : false
    'max reconnection attempts' : Infinity
    'port'                      : 443
    'reconnection limit'        : 30000
    'secure'                    : true
    'sync disconnect on unload' : false

  @latency: 0


  constructor: (endpointUrl, @fileId, @user, @authObj, options = {}) ->
    options = _.pick(options, _.keys(TandemNetworkAdapter.DEFAULTS))
    @settings = _.extend({}, TandemNetworkAdapter.DEFAULTS, options)
    @id = _.uniqueId('adapter-')
    @socketListeners = []
    @sendQueue = []
    @ready = false
    @stats =
      send     : {}
      recieve  : {}
      callback : {}
    @history = []
    socketOptions = _.clone(@settings)
    parts = endpointUrl.split(':')
    host = parts[0]
    socketOptions['port'] = parseInt(parts[1]) if parts.length > 1
    @socket = io.connect("https://#{host}", socketOptions)
    @socket.on('reconnecting', =>
      @ready = false
    ).on('reconnect', =>
      authenticate.call(this) if @ready == false
    )
    authenticate.call(this)

  on: (route, callback) ->
    if _.indexOf(_.values(TandemNetworkAdapter.events), route) > -1
      super
    else
      onSocketCallback = (packet) =>
        console.info "Got", route, packet
        track.call(this, TandemNetworkAdapter.RECIEVE, route, packet)
        callback.call(this, packet) if callback?
      @socket.removeListener(route, onSocketCallback) if @socketListeners[route]?
      @socketListeners[route] = onSocketCallback
      @socket.addListener(route, onSocketCallback)
    return this

  removeAllListeners: ->
    @socket.removeAllListeners()
    @socketListeners = []

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
