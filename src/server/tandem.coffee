TandemNetwork = require('./network')
TandemStorage = require('./storage')

class TandemServer
  constructor: (endpointUrl, server, options = {}) ->
    @storage = new TandemStorage(endpointUrl)
    @network = new TandemNetwork(server, @storage, options)
    @network.on(TandemNetwork.events.CONNECT, (client, metadata) ->
      # By this point, client will be authenticated
      @storage.find(metadata.fileId, (err, file) =>
        file.addClient(client, metadata)
        client.on('debug/clear', (packet, callback) =>
          return callback("Cannot be called on production") if process.env.NODE_ENV == 'production'
          @storage.clear()
          callback({ error: [] })
        )
      )
    )

module.exports = TandemServer
