_       = require('underscore')._
expect  = require('chai').expect
http    = require('http')
TandemClient = require('../client')
TandemServer = require('../index')

describe('Connection', ->
  it('should connect', (done) ->
    httpServer = http.createServer()
    httpServer.listen(9090)
    server = new TandemServer.Server(httpServer)
    client = new TandemClient.Client('http://localhost:9090')
    file = client.open('connect-test-file')
    file.on(TandemClient.File.events.READY, ->
      expect(file.health).to.equal(TandemClient.File.health.HEALTHY)
      httpServer.close()
      done()
    )
  )
)
