TandemFile      = require('./file')
TandemNetwork   = require('./network')


class TandemClient
  constructor: (@endpointUrl, @user, @settings = {}) ->

  open: (fileId, authObj, initial, version = 0) ->
    @adapter = new TandemNetwork(@endpointUrl, fileId, @user, authObj, @settings)
    return new TandemFile(fileId, @adapter, initial, version)


module.exports = TandemClient
