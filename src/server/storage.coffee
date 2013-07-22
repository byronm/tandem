_             = require('underscore')._
async         = require('async')
request       = require('request')
EventEmitter  = require('events').EventEmitter
Tandem        = require('tandem-core')
TandemFile    = require('./file')


_check = (force = false, done = ->) ->
  async.each(_.values(@files), (file, callback) =>
    return if !file? or _.isArray(file)
    usersConnected = _.any(file.users, (online, userId) -> return online > 0 )
    if force or !usersConnected or file.lastUpdated + @settings['inactive timeout'] < Date.now()
      _save.call(this, file, (err) =>
        return @server.emit(@server.events.ERROR, err) if err?
        if usersConnected and !force
          callback(null)
        else
          _close.call(this, file, callback)
      )
    else
      callback(null)
  , (err) =>
    done(err)
  )

_close = (file, callback) ->
  file.close((err) =>
    if err?
      @server.emit(@server.events.ERROR, err)
    else
      delete @files[file.id]
    callback(err)
  )

_save = (file, callback) ->
  return callback(null) if !file.isDirty()
  version = file.getVersion()
  head = file.getHead()
  if @storage?
    file.getHistory(file.versionSaved, (err, deltas) =>
      return callback(err) if err?
      @storage.update(file.id, head, version, deltas, (err) ->
        file.versionSaved = version unless err?
        callback(err)
      )
    )
  else
    file.versionSaved = version unless err?
    callback(null)


class TandemStorage
  @DEFAULTS:
    'check interval'   : 1000 * 60
    'inactive timeout' : 1000 * 60 * 15

  constructor: (@server, @storage, @options = {}) ->
    @settings = _.defaults(_.pick(options, _.keys(TandemStorage.DEFAULTS)), TandemStorage.DEFAULTS)
    @files = {}
    setInterval( =>
      _check.call(this)
    , @settings['check interval'])
    process.on('SIGTERM', =>
      _check.call(this, true, (err) =>
        @server.emit(@server.events.ERROR, err) if err?
        process.exit(if err? then 1 else 0) 
      )
    )

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
          new TandemFile(@server, id, head, version, @options, callback)
      ], (err, file) =>
        callbacks = @files[id]
        @files[id] = if err? then undefined else file
        _.each(callbacks, (callback) =>
          callback(err, file)
        )
      )
      

module.exports = TandemStorage
