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

class TandemCache
  @OPERATIONS: ['del', 'get', 'push', 'range', 'set']

  constructor: (@id) ->
    _.each(TandemCache.OPERATIONS, (fnName) =>
      this[fnName] = _.wrap(this[fnName], (fn, key, args...) =>
        fn.call(this, "#{@id}-#{key}", args...)
      )
    )

  del: (key, callback) ->
    console.warn "Should be overwritten by descendant"

  get: (key, callback) ->
    console.warn "Should be overwritten by descendant"

  push: (key, value, callback) ->
    console.warn "Should be overwritten by descendant"

  # End is optional, can be negative, and is exclusive
  range: (key, start, end, callback) ->
    console.warn "Should be overwritten by descendant"

  set: (key, value, callback) ->
    console.warn "Should be overwritten by descendant"
    

module.exports = TandemCache
