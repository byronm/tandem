_             = require('lodash')._
async         = require('async')
TandemEmitter = require('./emitter')
TandemFile    = require('./file')


_check = (force = false, done = ->) ->
  async.each(_.values(@_files), (file, callback) =>
    return if !file? or _.isArray(file)
    isClosed = !@network.checkOpen(file.id)
    if force or isClosed or file.lastUpdated + @settings['inactive timeout'] < Date.now()
      _save.call(this, file, (err) =>
        return TandemEmitter.emit(TandemEmitter.events.ERROR, err) if err?
        return _close.call(this, file, callback) if isClosed
        callback(null)
      )
    else
      callback(null)
  , (err) =>
    done(err)
  )

_close = (file, callback) ->
  file.close((err) =>
    if err?
      TandemEmitter.emit(TandemEmitter.events.ERROR, err)
    else
      delete @_files[file.id]
    callback(err)
  )

_save = (file, callback) ->
  return callback(null) if !file.isDirty()
  version = file.version
  head = file.head
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


class TandemFileManager
  @DEFAULTS:
    'check interval'   : 1000 * 60
    'inactive timeout' : 1000 * 60 * 15

  constructor: (@network, @storage, @options = {}) ->
    @settings = _.defaults(_.pick(options, _.keys(TandemFileManager.DEFAULTS)), TandemFileManager.DEFAULTS)
    @_files = {}
    setInterval( =>
      _check.call(this)
    , @settings['check interval'])

  find: (id, callback) ->
    return callback(null, @_files[id]) if @_files[id]?
    async.waterfall([
      (callback) =>
        @storage.find(id, callback)
      (head, version, callback) =>
        new TandemFile(id, head, version, @options, callback)
    ], (err, file) =>
      @_files[id] = file unless @_files[id]?  # Unless is to prevent race conditions
      callback(err, @_files[id])
    )

  stop: (callback) ->
    _check.call(this, true, callback)
      

module.exports = TandemFileManager
