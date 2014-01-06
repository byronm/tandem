Tandem = require('tandem-core')


class TandemStorage
  authorize: (authPacket, callback) ->
    callback(null)

  find: (fileId, callback) ->
    callback(null, Tandem.Delta.getInitial(''), 0)

  update: (fileId, head, version, deltas, callback) ->
    callback(null)


module.exports = TandemStorage