_       = require('underscore')._
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

  return
  it('should detect disconnect', (done) ->
    file = client.open('disconnect-test')
    file.on(TandemClient.File.events.READY, ->
      expect(file.health).to.equal(TandemClient.File.health.HEALTHY)
      server.network.on(TandemServer.Network.events.DISCONNECT, (client) =>
        expect(client).to.exist
        client.get('metadata', (err, metadata) =>
          expect(err).to.not.exist
          expect(metadata.fileId).to.equal('disconnect-test')
          done()
        )
      )
      console.log('switch')
      client.adapter.socket.disconnect()
    )
  )
)
