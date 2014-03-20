_ = require('lodash')
TandemFile    = require('./file')
TandemAdapter = require('./network/adapter')


class TandemClient
  @DEFAULTS:
    userId: null
    network: TandemAdapter

  constructor: (@endpointUrl, @options = {}) ->
    options = _.pick(@options, _.keys(TandemClient.DEFAULTS))
    @settings = _.extend({}, TandemClient.DEFAULTS, options)
    @settings.userId = 'anonymous-' + _.random(1000000) unless @settings.userId?

  open: (fileId, authObj, initial, callback) ->
    @adapter = if _.isFunction(@settings.network) then new @settings.network(@endpointUrl, fileId, @settings.userId, authObj, @options) else @settings.network
    return new TandemFile(fileId, @adapter, initial, callback)


module.exports = TandemClient
