Tandem = require('tandem')

server = require('http').Server()
server.listen(8080)
new Tandem.Server(server, { 'log level': 3 })
