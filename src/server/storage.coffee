_           = require('underscore')._
request     = require('request')
Tandem      = require('tandem-core')
TandemFile  = require('./file')


save = (file, callback = ->) ->
  return callback(null) if !file.isDirty()
  version = file.getVersion()
  if @storage?
    @storage.update(file.id, file.getHead(), version, (err) ->
      file.versionSaved = version unless err?
      callback(err)
    )
  else
    file.versionSaved = version unless err?
    callback(null)


class TandemStorage
  @DEFAULTS:
    'save interval': 10000

  constructor: (@storage, @options = {}) ->
    @settings = _.extend({}, TandemStorage.DEFAULTS, _.pick(@options, _.keys(TandemStorage.DEFAULTS)))
    @files = {}
    setInterval( =>
      _.each(@files, (file, id) =>
        save.call(this, file) unless !file? or _.isArray(file)
      )
    , @settings['save interval'])

  authorize: (authPacket, callback) ->
    return callback(null) unless @storage?
    @storage.authorize(authPacket, callback)

  clear: ->
    @files = {}

  find: (id, callback) ->
    newFileCallback = (err, file) =>
      callbacks = @files[id]
      @files[id] = if err? then undefined else file
      _.each(callbacks, (callback) =>
        callback(err, file)
      )

    if @files[id]?
      if _.isArray(@files[id])
        @files[id].push(callback)
      else
        callback(null, @files[id])
    else
      @files[id] = [callback]
      if @storage?
        @storage.find(id, (err, head, version) =>
          return newFileCallback(err) if err?
          new TandemFile(id, head, version, @options, newFileCallback)
        )
      else
        new TandemFile(id, Tandem.Delta.getInitial(''), 0, @options, newFileCallback)
      


module.exports = TandemStorage
