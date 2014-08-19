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

EventEmitter  = require('events').EventEmitter
Tandem        = require('tandem-core')


_makeResyncPacket = (file) ->
  return {
    resync  : true
    head    : file.head
    version : file.version
  }

_onMessageError = (err, sessionId, file, callback) ->
  err.fileId = file.id
  err.sessionId = sessionId
  TandemEmitter.emit(TandemEmitter.events.ERROR, err)
  callback(_makeResyncPacket(file))


class TandemNetworkAdapter
  # Descendants should listen on these message routes
  @routes:
    RESYNC    : 'ot/resync'
    SYNC      : 'ot/sync'
    UPDATE    : 'ot/update'

  constructor: (httpServer, @fileManager) ->

  handle: (route, fileId, packet, callback) ->
    return callback('Undefined fileId') unless fileId?
    @fileManager.find(fileId, (err, file) =>
      return callback(err, { error: err }) if err?
      resyncHandler = (err, file, callback) ->
        callback(err, _makeResyncPacket(file))
      switch route
        when TandemNetworkAdapter.routes.RESYNC
          resyncHandler(null, file, callback)
        when TandemNetworkAdapter.routes.SYNC
          return resyncHandler(err, file, callback) if err?
          file.sync(parseInt(packet.version), (err, delta, version) =>
            callback(err, {
              delta: delta
              version: version
            })
          )
        when TandemNetworkAdapter.routes.UPDATE
          return resyncHandler(err, file, callback) if err?
          file.update(Tandem.Delta.makeDelta(packet.delta), parseInt(packet.version), (err, delta, version) =>
            if err?
              resyncHandler(err, file, callback)
            else
              callback(null, {
                fileId  : fileId
                version : version
              }, {
                delta   : delta
                fileId  : fileId
                version : version
              })
          )
        else
          callback(new Error('Unexpected network route'))
    )

module.exports = TandemNetworkAdapter
