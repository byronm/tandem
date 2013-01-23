_           = require('underscore')._
request     = require('request')
Tandem      = require('../core')
TandemFile  = require('./file')


class TandemStorage
  constructor: (@endpointUrl, options) ->
    @files = {}

  checkAccess: (docId, authObj, callback) ->
    request.get({
      uri: "#{@endpointUrl}/#{docId}/check_access"
      json: { auth_obj: authObj }
    }, (err, response, body) ->
      err = "Response error: #{response.statusCode}" unless response.statusCode == 200
      callback(err, body.access)
    )

  clear: ->
    @files = {}

  find: (id, callback) ->
    if @files[id]?
      if _.isArray(@files[id])
        @files[id].push(callback)
      else
        callback(null, @files[id])
    else
      @files[id] = [callback]
      request.get({
        uri: "#{@endpointUrl}/#{id}"
        json: true
      }, (err, response, body) =>
        err = "Response error: #{response.statusCode}" unless response.statusCode == 200
        callbacks = @files[id]
        @files[id] = undefined
        unless err?
          head = Tandem.Delta.makeDelta(body.head)
          version = parseInt(body.version)
          @files[id] = new TandemFile(id, head, version)
        _.each(callbacks, (callback) =>
          callback(err, @files[id])
        )
      )


module.exports = TandemStorage
