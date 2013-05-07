_           = require('underscore')
TandemCache = require('./cache')

storage = {}

class TandemMemoryCache extends TandemCache
  constructor: (@id, callback) ->
    super
    callback(this)

  del: (key, callback) ->
    delete storage[key]
    callback(null)

  get: (key, callback) ->
    callback(null, storage[key])

  push: (key, value, callback) ->
    unless _.isArray(storage[key])
      storage[key] = []
    storage[key].push(value)
    callback(null, storage[key].length)

  range: (key, start, end, callback) ->
    if _.isFunction(end)
      callback = end
      end = undefined
    ret = if _.isArray(storage[key]) then storage[key].slice(start, end) else []
    callback(null, ret)

  set: (key, value, callback) ->
    storage[key] = value
    callback(null)


module.exports = TandemMemoryCache
