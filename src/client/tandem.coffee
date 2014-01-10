TandemFile    = require('./file')
TandemSocket  = require('./network/socket')


class TandemClient
  @DEFAULTS:
    userId: null

  constructor: (@endpointUrl, @options = {}) ->    
    options = _.pick(@options, _.keys(TandemClient.DEFAULTS))
    @settings = _.extend({}, TandemClient.DEFAULTS, options)
    @settings.userId = 'anonymous-' + _.random(1000000) unless @settings.userId?

  open: (fileId, authObj, initial) ->
    @adapter = new TandemSocket(@endpointUrl, fileId, @settings.userId, authObj, @options)
    return new TandemFile(fileId, @adapter, initial)


module.exports = TandemClient
