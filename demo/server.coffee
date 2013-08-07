Tandem = require('tandem')

server = require('http').Server()
server.listen(8000)
new Tandem.Server(server, { 'log level': 3 })
