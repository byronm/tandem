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

_ = require('lodash')
TandemFile    = require('./file')
TandemAdapter = require('./network/adapter')


class TandemClient
  @DEFAULTS:
    userId: null
    network: TandemAdapter

  constructor: (@endpointUrl, @options = {}) ->
    options = _.pick(@options, _.keys(TandemClient.DEFAULTS))
    @settings = _.extend({}, TandemClient.DEFAULTS, options)
    @settings.userId = 'anonymous-' + _.random(1000000) unless @settings.userId?

  open: (fileId, authObj, initial, callback) ->
    @adapter = if _.isFunction(@settings.network) then new @settings.network(@endpointUrl, fileId, @settings.userId, authObj, @options) else @settings.network
    return new TandemFile(fileId, @adapter, initial, callback)


module.exports = TandemClient
