class TandemClient
  constructor: (@endpointUrl, @user, @settings = {}) ->

  open: (fileId, authObj, initial, version = 0) ->
    @adapter = new Tandem.NetworkAdapter(@endpointUrl, fileId, @user, authObj, @settings)
    return new Tandem.File(fileId, @adapter, initial, version)


Tandem.Client = TandemClient
