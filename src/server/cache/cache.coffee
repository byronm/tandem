_ = require('underscore')._

class TandemCache
  @OPERATIONS: ['del', 'get', 'push', 'range', 'set']

  constructor: (@id, callback) ->
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
