engine       = require 'engine.io'
_            = require 'underscore'
EventEmitter = require('events').EventEmitter

EVENTS = {
  'close'
  'create'
  'join'
  'leave'
}

# TODO: Config
server = engine.listen 1700
rooms = {}
emitters = {}
room_notifier = new EventEmitter

server.on('connection', (socket) ->
  socket.once('message',  (auth) ->
    { fileId } = auth = JSON.parse auth

    send = (event, data) -> socket.send JSON.stringify {event, data}

    broadcast = (event, data) ->
      _.chain(rooms[fileId])
        .tap((sockets) -> console.log _.pluck(sockets, 'id'))
        .without(socket)
        .tap((sockets) -> console.log _.pluck(sockets, 'id'))
        .each((socket) ->
          socket.send JSON.stringify {event, data}
        )

    psocket = _.extend new EventEmitter, { send, broadcast }

    setTimeout( -> # fake auth
      if true
        unless rooms[fileId]?
          rooms[fileId] = []
          emitters[fileId] = new EventEmitter
          room_notifier.emit(EVENTS.create, fileId, emitters[fileId])
        rooms[fileId].push socket
        emitters[fileId].emit EVENTS.join, psocket

        socket.on('message', (data) ->
          msg = JSON.parse data
          psocket.emit(msg.event, msg.data)
        )

        socket.on('close', ->
          rooms[fileId] = _.without(rooms[fileId], socket)
          psocket.emit EVENTS.leave
          if _.isEmpty rooms[fileId]
            emitters[fileId].emit EVENTS.close
            delete rooms[fileId]
        )

        socket.send('auth success')
      else
        socket.close('auth fail')
    , 2000)
  )
)


module.exports = { EVENTS, room_notifier }
