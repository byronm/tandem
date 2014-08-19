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

_                     = require('lodash')
EventEmitter          = require('events').EventEmitter
TandemNetworkAdapter  = require('./network/adapter')
TandemEmitter         = require('./emitter')
TandemFileManager     = require('./file-manager')
TandemMemoryCache     = require('./cache/memory')
TandemSocket          = require('./network/socket')
TandemStorage         = require('./storage')


class TandemServer extends EventEmitter
  @events:
    ERROR  : 'tandem-error'
  @routes: TandemNetworkAdapter.routes
  @DEFAULTS:
    cache   : TandemMemoryCache
    network : TandemSocket
    storage : TandemStorage

  constructor: (server, options = {}) ->
    @settings = _.defaults(options, TandemServer.DEFAULTS)
    @storage = if _.isFunction(@settings.storage) then new @settings.storage else @settings.storage
    @fileManager = new TandemFileManager(@storage, @settings)
    @settings.network = TandemNetworkAdapter if @settings.network == 'base'
    @network = if _.isFunction(@settings.network) then new @settings.network(server, @fileManager, @storage, @settings) else @settings.network
    TandemEmitter.on(TandemEmitter.events.ERROR, (args...) =>
      this.emit(TandemServer.events.ERROR, args...)
    )

  stop: (callback) ->
    @fileManager.stop(callback)


module.exports = TandemServer
