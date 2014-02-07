_ = require('lodash')
io = require('socket.io-client')
TandemAdapter = require('./adapter')


authenticate = ->
  authPacket =
    auth: @authObj
    fileId: @fileId
    userId: @userId
  info.call(this, "Attempting auth to", @fileId, authPacket)
  @socket.emit('auth', authPacket, (response) =>
    unless response.error?
      info.call(this, "Connected!", response)
      this.setReady() if @ready == false
    else
      this.emit(TandemAdapter.events.ERROR, response.error)
  )

info = (args...) ->
  return unless @settings.debug
  return unless console?.info?
  if _.isFunction(console.info.apply)
    console.info(args...)
  else
    console.info(args)

track = (type, route, packet) ->
  @stats[type] = {} unless @stats[type]?
  @stats[type][route] = 0  unless @stats[type][route]?
  @stats[type][route] += 1


class TandemSocketAdapter extends TandemAdapter
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
    super
    options = _.pick(options, _.keys(TandemSocketAdapter.DEFAULTS).concat(_.keys(TandemSocketAdapter.IO_DEFAULTS)))
    @settings = _.extend({}, TandemSocketAdapter.DEFAULTS, TandemSocketAdapter.IO_DEFAULTS, options)
    @id = _.uniqueId('adapter-')
    @socketListeners = {}
    @stats =
      send     : {}
      recieve  : {}
      callback : {}
    socketOptions = _.clone(@settings)
    url = TandemSocketAdapter.parseUrl(endpointUrl)
    if url.protocol == 'https:'
      socketOptions['secure'] = true
      socketOptions['port'] = 443
    socketOptions['port'] = url.port if url.port
    socketOptions['query'] = "fileId=#{@fileId}"
    @socket = io.connect("#{url.protocol}//#{url.hostname}", socketOptions)
    @socket.on('reconnecting', =>
      this.emit(TandemAdapter.events.RECONNECTING)
      @ready = false
    ).on('reconnect', =>
      this.emit(TandemAdapter.events.RECONNECT)
      authenticate.call(this) if @ready == false
    ).on('disconnect', =>
      this.emit(TandemAdapter.events.DISCONNECT)
    )
    authenticate.call(this)

  close: ->
    super
    @socket.removeAllListeners()
    @socketListeners = {}

  listen: (route, callback) ->
    onSocketCallback = (packet) =>
      info.call(this, "Got", route, packet)
      track.call(this, TandemSocketAdapter.RECIEVE, route, packet)
      callback.call(this, packet) if callback?
    @socket.removeListener(route, onSocketCallback) if @socketListeners[route]?
    @socketListeners[route] = onSocketCallback
    @socket.addListener(route, onSocketCallback)
    return this

  _send: (route, packet, callback) ->
    track.call(this, TandemSocketAdapter.SEND, route, packet)
    setTimeout( =>
      if callback?
        @socket.emit(route, packet, (response) =>
          track.call(this, TandemSocketAdapter.CALLBACK, route, response)
          info.call(this, 'Callback:', response)
          callback.call(this, response)
        )
      else
        @socket.emit(route, packet)
    , @settings.latency)


module.exports = TandemSocketAdapter
