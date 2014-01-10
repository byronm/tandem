_       = require('lodash')._
expect  = require('chai').expect
http    = require('http')
TandemClient = require('../../client')
TandemServer = require('../../index')

describe('Connection', ->
  httpServer = server = client = null
  
  before( ->
    httpServer = http.createServer()
    httpServer.listen(9090)
    server = new TandemServer.Server(httpServer)
    client = new TandemClient.Client('http://localhost:9090')
  )

  after( ->
    httpServer.close()
  )

  it('should connect', (done) ->
    file = client.open('connect-test')
    file.on(TandemClient.File.events.READY, ->
      expect(file.health).to.equal(TandemClient.File.health.HEALTHY)
      file.close()
      done()
    )
  )

  it('should detect disconnect', (done) ->
    file = client.open('disconnect-test')
    file.on(TandemClient.File.events.READY, ->
      expect(file.health).to.equal(TandemClient.File.health.HEALTHY)
      client.adapter.socket.disconnect()
      expect(server.network.io.sockets.clients('disconnect-test').length).to.equal(1)
      setTimeout( =>
        expect(server.network.io.sockets.clients('disconnect-test').length).to.equal(0)
        done()
      , 100)
    )
  )
)
