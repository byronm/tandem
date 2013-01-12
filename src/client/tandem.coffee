class TandemClient
  constructor: (@endpointUrl, @user) ->

  open: (docId, authObj, initial, version = 0) ->
    @adapter = new Tandem.NetworkAdapter(@endpointUrl, docId, @user, authObj)
    return new Tandem.File(docId, @adapter, initial, version)


Tandem.Client = TandemClient
