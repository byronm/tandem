class TandemClient
  constructor: (@endpointUrl, @user) ->

  open: (docId, authObj, initial, version = 0) ->
    @adapter = new Tandem.NetworkAdapter(@endpointUrl, docId, @user, authObj)
    engine = new Tandem.ClientEngine(initial, version, (delta, version, callback) =>
      @adapter.send(Tandem.File.routes.UPDATE, { delta: delta, version: version }, callback)
    )
    return new Tandem.File(docId, @adapter, engine)


Tandem.Client = TandemClient
