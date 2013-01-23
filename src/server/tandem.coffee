TandemNetwork = require('./network')
TandemStorage = require('./storage')

class TandemServer
  constructor: (endpointUrl, server) ->
    @network = new TandemNetwork(server)
    @storage = new TandemStorage(endpointUrl)

    @network.on('connection', (client, metadata) ->
      # By this point, client will be authenticated
      @storage.find(metadata.docId, (file) ->
        file.addClient(client, metadata)
      )
    )

module.exports = TandemServer
