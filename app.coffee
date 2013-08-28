http = require 'http'
fs = require 'fs'
url = require 'url'
io = require './io'

handler = (req, res) ->
  path = url.parse(req.url).pathname
  path = "index.html" if path == "/"
  fs.readFile(__dirname + "/#{path}",
    (err, data) ->
      if err
        res.writeHead 500
        return res.end 'Error loading page.'
      res.writeHead 200
      res.end data
  )

port = 1701
http = http.createServer(handler).listen(port)
console.log "Listening on #{port}"

io.room_notifier.on(io.EVENTS.create, (file_id, room_emitter) ->
  room_emitter.on(io.EVENTS.join, (socket) ->
    socket.on('test', (data) ->
      console.log "Got the test."
      socket.broadcast('broadcast_test', hi: 'mom')
    )

    socket.on(io.EVENTS.leave, ->
      console.log "Got a leave."
    )
  )

  room_emitter.on(io.EVENTS.close, ->
    console.log "Room empty."
  )
)
