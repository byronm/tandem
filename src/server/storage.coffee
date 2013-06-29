_             = require('underscore')._
async         = require('async')
request       = require('request')
EventEmitter  = require('events').EventEmitter
Tandem        = require('tandem-core')
TandemFile    = require('./file')


save = (file, callback = ->) ->
  return callback(null) if !file.isDirty()
  version = file.getVersion()
  head = file.getHead()
  if @storage?
    file.getHistory(file.versionSaved, (err, deltas) =>
      return callback(err) if err?
      @storage.update(file.id, version, head, deltas, (err) ->
        file.versionSaved = version unless err?
        callback(err)
      )
    )
  else
    file.versionSaved = version unless err?
    callback(null)


class TandemStorage
  @DEFAULTS:
    'save interval': 10000

  constructor: (@storage, @options = {}) ->
    @settings = _.defaults(_.pick(options, _.keys(TandemStorage.DEFAULTS)), TandemStorage.DEFAULTS)
    @files = {}
    setInterval( =>
      _.each(@files, (file, id) =>
        return if !file? or _.isArray(file)
        save.call(this, file, (err) =>
          file.emit(TandemFile.events.ERROR, err) if err?
        )
      )
    , @settings['save interval'])

  authorize: (authPacket, callback) ->
    return callback(null) unless @storage?
    @storage.authorize(authPacket, callback)

  find: (id, callback) ->
    if @files[id]?
      if _.isArray(@files[id])
        @files[id].push(callback)
      else
        callback(null, @files[id])
    else
      @files[id] = [callback]
      async.waterfall([
        (callback) =>
          if @storage?
            @storage.find(id, callback)
          else
            callback(null, Tandem.Delta.getInitial(''), 0)
        (head, version, callback) =>
          new TandemFile(id, head, version, @options, callback)
      ], (err, file) =>
        callbacks = @files[id]
        @files[id] = if err? then undefined else file
        _.each(callbacks, (callback) =>
          callback(err, file)
        )
      )
      


module.exports = TandemStorage
