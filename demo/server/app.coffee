Tandem = require('tandem')

server = require('http').Server()
server.listen(80)
new Tandem.Server(httpServer, { 'log level': 3 })
