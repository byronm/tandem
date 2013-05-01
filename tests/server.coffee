expect  = require('chai').expect
http    = require('http')
io      = require('socket.io-client')
Tandem  = require('../src/server/tandem')


describe('connect', ->
  it('should connect', (done) ->
    httpServer = http.createServer()
    httpServer.listen(9000)
    tandem = new Tandem.Server(httpServer, { 'log level': 0 })
    socket = io.connect('http://localhost:9000')
    timeout = setTimeout( ->
      expect(false).to.be.true
      done()
    , 10000)
    socket.on('connect', ->
      clearTimeout(timeout)
      expect(true).to.be.true
      done()
    )
  )
)
