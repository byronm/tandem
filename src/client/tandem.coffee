TandemFile      = require('./file')
TandemNetwork   = require('./network')


class TandemClient
  constructor: (@endpointUrl, @userId, @settings = {}) ->

  open: (fileId, authObj, initial, version = 0) ->
    @adapter = new TandemNetwork(@endpointUrl, fileId, @userId, authObj, @settings)
    return new TandemFile(fileId, @adapter, initial, version)


module.exports = TandemClient
