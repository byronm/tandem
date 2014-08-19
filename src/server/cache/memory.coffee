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

_           = require('lodash')
TandemCache = require('./cache')


class TandemMemoryCache extends TandemCache
  @storage: {}

  constructor: (@id) ->
    super

  del: (key, callback) ->
    delete TandemMemoryCache.storage[key]
    callback(null)

  get: (key, callback) ->
    callback(null, TandemMemoryCache.storage[key])

  push: (key, value, callback) ->
    TandemMemoryCache.storage[key] ?= []
    TandemMemoryCache.storage[key].push(value)
    callback(null, TandemMemoryCache.storage[key].length)

  range: (key, start, end, callback) ->
    if _.isFunction(end)
      callback = end
      end = undefined
    ret = if _.isArray(TandemMemoryCache.storage[key]) then TandemMemoryCache.storage[key].slice(start, end) else []
    callback(null, ret)

  set: (key, value, callback) ->
    TandemMemoryCache.storage[key] = value
    callback(null)


module.exports = TandemMemoryCache
