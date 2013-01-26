class TandemClient
  constructor: (@endpointUrl, @user, @settings = {}) ->

  open: (docId, authObj, initial, version = 0) ->
    @adapter = new Tandem.NetworkAdapter(@endpointUrl, docId, @user, authObj, @settings)
    return new Tandem.File(docId, @adapter, initial, version)


Tandem.Client = TandemClient
