TandemFile = require('./file')

class TandemStorage
  constructor: (@endpointUrl, options) ->
    @pads = {}

  checkAccess: (docId, authObj, callback) ->
    request.get({
      uri: @endpointUrl
      json: { auth_obj: authObj }
    }, (err, response, body) ->
      err = "Response error: #{response.statusCode}" unless response.statusCode == 200
      callback(err, body.access)
    )

  clear: ->
    TandemFile.files = {}

  find: (id, callback) ->
    if TandemFile.files[id]?
      if _.isArray(TandemFile.files[id])
        TandemFile.files[id].push(callback)
      else
        callback(null, TandemFile.files[id])
    else
      TandemFile.files[id] = [callback]
      request.get({
        uri: @endpointUrl
        json: true
      }, (err, response, body) ->
        err = "Response error: #{response.statusCode}" unless response.statusCode == 200
        callbacks = TandemFile.files[id]
        TandemFile.files[id] = undefined
        unless err?
          head = Tandem.Delta.makeDelta(body.head)
          version = parseInt(body.version)
          TandemFile.files[id] = new TandemFile(id, head, version)
        _.each(callbacks, (callback) ->
          callback(err, TandemFile.files[id])
        )
      )


module.exports = TandemStorage
