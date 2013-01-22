class TandemServer
  constructor: (endpointUrl, server) ->
    @network = new Tandem.Network(server)
    @storage = new Tandem.Storage(endpointUrl)

    @network.on('connection', (client, metadata) ->
      # By this point, client will be authenticated
      @storage.find(metadata.docId, (file) ->
        file.addClient(client, metadata)
      )
    )
