TandemNetwork = require('./network')
TandemStorage = require('./storage')

class TandemServer
  constructor: (endpointUrl, server, options) ->
    @storage = new TandemStorage(endpointUrl)
    @network = new TandemNetwork(server, @storage, options)

    @network.on(TandemNetwork.events.CONNECT, (client, metadata) ->
      # By this point, client will be authenticated
      @storage.find(metadata.docId, (err, file) ->
        file.addClient(client, metadata)
      )
    )

module.exports = TandemServer
