_           = require('underscore')._
request     = require('request')
Tandem      = require('../core/tandem')
TandemFile  = require('./file')


save = (file, callback = ->) ->
  return callback(null) if !file.isDirty()
  unless @endpointUrl?
    file.versionSaved = version unless err?
    callback(null)
  else
    version = file.getVersion()
    request.put({
      json: 
        head: file.getHead()
        version: version
      uri: "#{@endpointUrl}/#{file.id}"
    }, (err, response) =>
      err = "Response error: #{response.statusCode}" unless response.statusCode == 200
      file.versionSaved = version unless err?
      callback(err)
    )


class TandemStorage
  @DEFAULTS:
    'save interval': 1000

  constructor: (@endpointUrl, options = {}) ->
    options = _.pick(options, _.keys(TandemStorage.DEFAULTS))
    @settings = _.extend({}, TandemStorage.DEFAULTS, options)
    @files = {}
    setInterval( =>
      _.each(@files, (file, id) =>
        save.call(this, file) unless !file? or _.isArray(file)
      )
    , @settings['save interval'])

  checkAccess: (fileId, authObj, callback) ->
    return callback(null, true) unless @endpointUrl?
    request.get({
      uri: "#{@endpointUrl}/#{fileId}/check_access"
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
    else if !@endpointUrl?
      @files[id] = new TandemFile(id, Tandem.Delta.getInitial('\n'), 1)
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
