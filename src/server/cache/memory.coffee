_           = require('underscore')
TandemCache = require('./cache')


class TandemMemoryCache extends TandemCache
  @storage: {}

  constructor: (@id, callback) ->
    super
    callback(this)

  del: (key, callback) ->
    delete TandemMemoryCache.storage[key]
    callback(null)

  get: (key, callback) ->
    callback(null, TandemMemoryCache.storage[key])

  push: (key, value, callback) ->
    unless _.isArray(TandemMemoryCache.storage[key])
      TandemMemoryCache.storage[key] = []
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
