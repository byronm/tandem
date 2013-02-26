_           = require('underscore')
TandemStore = require('./store')

class TandemMemoryStore extends TandemStore
  constructor: ->
    @storage = {}

  get: (key, callback) ->
    callback(null, @storage[key])

  set: (key, value, callback) ->
    @storage[key] = value
    callback(null)

  push: (key, value, callback) ->
    if !@storage[key]? or !_.isArray(@storage[key])
      @storage[key] = []
    @storage[key].push(value)
    callback(null, @storage.length)


module.export = TandemMemoryStore
