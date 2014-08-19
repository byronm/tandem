# Copyright (c) 2012, Salesforce.com, Inc.  All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# Redistributions of source code must retain the above copyright notice, this
# list of conditions and the following disclaimer.  Redistributions in binary
# form must reproduce the above copyright notice, this list of conditions and
# the following disclaimer in the documentation and/or other materials provided
# with the distribution.  Neither the name of Salesforce.com nor the names of
# its contributors may be used to endorse or promote products derived from this
# software without specific prior written permission.

_             = require('lodash')
async         = require('async')
TandemEmitter = require('./emitter')
TandemFile    = require('./file')


_check = (force = false, done = ->) ->
  async.each(_.values(@_files), (file, callback) =>
    return unless file?
    if force or file.lastUpdated + @settings['inactive timeout'] < Date.now()
      async.waterfall([
        _save.bind(this, file),
        _close.bind(this, file)
      ], (err) =>
        callback(null)  # Do not stop async.each loop so other files can be saved
      )
    else
      callback(null)
  , (err) =>
    done(err)
  )

_close = (file, callback) ->
  file.close((err) =>
    return TandemEmitter.emit(TandemEmitter.events.ERROR, err) if err?
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

  constructor: (@storage, @options = {}) ->
    @settings = _.defaults(_.pick(options, _.keys(TandemFileManager.DEFAULTS)), TandemFileManager.DEFAULTS)
    @_files = {}
    setInterval(_check.bind(this), @settings['check interval'])

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
