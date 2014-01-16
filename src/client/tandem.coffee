TandemFile    = require('./file')
TandemSocket  = require('./network/socket')


class TandemClient
  @DEFAULTS:
    userId: null
    network: TandemSocket

  constructor: (@endpointUrl, @options = {}) ->
    options = _.pick(@options, _.keys(TandemClient.DEFAULTS))
    @settings = _.extend({}, TandemClient.DEFAULTS, options)
    @settings.userId = 'anonymous-' + _.random(1000000) unless @settings.userId?

  open: (fileId, authObj, initial) ->
    @adapter = if _.isFunction(@settings.network) then new @settings.network(@endpointUrl, fileId, @settings.userId, authObj, @options) else @settings.network
    return new TandemFile(fileId, @adapter, initial)


module.exports = TandemClient
