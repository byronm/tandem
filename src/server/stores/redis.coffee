_           = require('underscore')
redis       = require('redis')
TandemStore = require('./store')

redisClient = redis.createClient()

class TandemRedisStore extends TandemStore
  constructor: (@id) ->
    super

  del: (key, callback) ->
    redisClient.del(key, callback)

  get: (key, callback) ->
    redisClient.get(key, callback)

  push: (key, value, callback) ->
    console.log 'push', key, value
    redisClient.rpush(key, value, callback)

  range: (key, start, end, callback) ->
    if _.isFunction(end)
      callback = end
      end = -1
    else
      end -= 1    # Since end is inclusive in redis lrange
    redisClient.lrange(key, start, end, (err, range) ->
      console.log key, start, end, range
      callback(err, range)
    )

  set: (key, value, callback) ->
    redisClient.set(key, value, callback)


module.exports = TandemRedisStore
