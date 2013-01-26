TandemNetwork = require('./network')
TandemStorage = require('./storage')

addClient = (client, metadata, callback = ->) ->
  @storage.find(metadata.fileId, (err, file) =>
    if !err? and file?
      file.addClient(client, metadata, callback)
    else
      callback()
  )

removeClient = (client, callback = ->) ->
  client.get('metadata', (err, metadata) =>
    if !err? and metadata?
      @storage.find(metadata.fileId, (err, file) =>
        if !err? and file?
          file.removeClient(client, callback)
        else
          callback()
      )
    else
      callback()
  )


class TandemServer
  constructor: (endpointUrl, server, options = {}) ->
    @storage = new TandemStorage(endpointUrl)
    @network = new TandemNetwork(server, @storage, options)
    @network.on(TandemNetwork.events.CONNECT, (client, metadata) ->
      # By this point, client will be authenticated
      removeClient.call(this, client, =>
        addClient.call(this, client, metadata, =>
          client.on('debug/clear', (packet, callback) =>
            return callback("Cannot be called on production") if process.env.NODE_ENV == 'production'
            @storage.clear()
            callback({ error: [] })
          )
        )
      )
    )


module.exports = TandemServer
