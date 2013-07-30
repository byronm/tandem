authenticate = ->
  authPacket =
    auth: @authObj
    fileId: @fileId
    userId: @userId
  info.call(this, "Attempting auth to", @fileId, authPacket)
  @socket.emit('auth', authPacket, (response) =>
    unless response.error?
      info.call(this, "Connected!", response)
      setReady.call(this) if @ready == false
    else
      this.emit(TandemNetworkAdapter.events.ERROR, response.error)
  )

doSend = (route, packet, callback) ->
  track.call(this, TandemNetworkAdapter.SEND, route, packet)
  setTimeout( =>
    if callback?
      @socket.emit(route, packet, (response) =>
        track.call(this, TandemNetworkAdapter.CALLBACK, route, response)
        info.call(this, 'Callback:', response)
        callback.call(this, response)
      )
    else
      @socket.emit(route, packet)
  , @settings.latency)

info = (args...) ->
  return unless @settings.debug
  console.info(args...) if console?.info?

setReady = ->
  this.emit(TandemNetworkAdapter.events.READY)
  async.until( =>
    return @sendQueue.length == 0
  , (callback) =>
    elem = @sendQueue.shift()
    [route, packet, sendCallback] = elem
    info.call(this, "Sending from queue:", route, packet)
    doSend.call(this, route, packet, (args...) =>
      sendCallback.apply(this, args) if sendCallback?
      callback()
    )
  , (err) =>
    @ready = true
  )

track = (type, route, packet) ->
  @stats[type] = {} unless @stats[type]?
  @stats[type][route] = 0  unless @stats[type][route]?
  @stats[type][route] += 1


class TandemNetworkAdapter extends EventEmitter2
  @events:
    DISCONNECT   : 'adapter-disconnect'
    ERROR        : 'adapter-error'
    READY        : 'adapter-ready'
    RECONNECT    : 'adapter-reconnect'
    RECONNECTING : 'adapter-reconnecting'

  @CALLBACK : 'callback'
  @RECIEVE  : 'recieve'
  @SEND     : 'send'

  @DEFAULTS:
    debug: false
    latency: 0

  @IO_DEFAULTS:
    'force new connection'      : true
    'max reconnection attempts' : Infinity
    'port'                      : 80
    'reconnection limit'        : 30000
    'sync disconnect on unload' : false

  @parseUrl: (url) ->
    a = document.createElement('a')
    a.href = url
    protocol = if a.protocol == 'http:' or a.protocol == 'https:' then a.protocol else 'http:'
    ret = { hostname: a.hostname, protocol: protocol }
    ret['port'] = a.port if a.port
    return ret


  constructor: (endpointUrl, @fileId, @userId, @authObj, options = {}) ->
    options = _.pick(options, _.keys(TandemNetworkAdapter.DEFAULTS).concat(_.keys(TandemNetworkAdapter.IO_DEFAULTS)))
    @settings = _.extend({}, TandemNetworkAdapter.DEFAULTS, TandemNetworkAdapter.IO_DEFAULTS, options)
    @id = _.uniqueId('adapter-')
    @socketListeners = {}
    @sendQueue = []
    @ready = false
    @stats =
      send     : {}
      recieve  : {}
      callback : {}
    socketOptions = _.clone(@settings)
    url = TandemNetworkAdapter.parseUrl(endpointUrl)
    if url.protocol == 'https:'
      socketOptions['secure'] = true
      socketOptions['port'] = 443
    socketOptions['port'] = url.port if url.port
    socketOptions['query'] = "fileId=#{@fileId}"
    @socket = io.connect("#{url.protocol}//#{url.hostname}", socketOptions)
    @socket.on('reconnecting', =>
      this.emit(TandemNetworkAdapter.events.RECONNECTING)
      @ready = false
    ).on('reconnect', =>
      this.emit(TandemNetworkAdapter.events.RECONNECT)
      authenticate.call(this) if @ready == false
    ).on('disconnect', =>
      this.emit(TandemNetworkAdapter.events.DISCONNECT)
    )
    authenticate.call(this)

  close: ->
    this.removeAllListeners()
    @socket.removeAllListeners()
    @socketListeners = {}

  on: (route, callback) ->
    if _.indexOf(_.values(TandemNetworkAdapter.events), route) > -1
      super
    else
      onSocketCallback = (packet) =>
        info.call(this, "Got", route, packet)
        track.call(this, TandemNetworkAdapter.RECIEVE, route, packet)
        callback.call(this, packet) if callback?
      @socket.removeListener(route, onSocketCallback) if @socketListeners[route]?
      @socketListeners[route] = onSocketCallback
      @socket.addListener(route, onSocketCallback)
    return this

  send: (route, packet, callback, priority = false) ->
    if @ready
      info.call(this, "Sending:", route, packet)
      doSend.call(this, route, packet, callback)
    else
      info.call(this, "Queued:", route, packet)
      if priority
        @sendQueue.unshift([route, packet, callback])
      else
        @sendQueue.push([route, packet, callback])


module.exports = TandemNetworkAdapter
