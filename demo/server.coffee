Tandem = require('../index')

server = require('http').Server()
server.listen(8008)
new Tandem.Server(server, { 'log level': 3 })
