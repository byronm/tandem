_       = require('underscore')._
expect  = require('chai').expect
http    = require('http')
TandemClient = require('../client')
TandemServer = require('../index')

describe('Storage', ->
  httpServer = http.createServer()
  httpServer.listen(9090)
  server = new TandemServer.Server(httpServer, {
    storage:
      authorize: (authPacket, callback) ->
        callback(if authPacket.auth.secret == 1337 then null else "Access Denied")
      find: (fileId, callback) ->
        if fileId == 'basic-auth-file'
          callback(null, new TandemServer.Delta(0, [
            new TandemServer.InsertOp('Hello World!')
          ]), 10)
        else
          callback('File not found')
      update: (fileId, head, version, callback) ->
        callback(null)
  })
  client = new TandemClient.Client('http://localhost:9090')

  it('should pass basic auth', (done) ->
    file = client.open('basic-auth-file', { secret: 1337 })
    file.on(TandemClient.File.events.READY, ->
      expect(file.health).to.equal(TandemClient.File.health.HEALTHY)
      done()
    )
  )

  it('should fail basic auth', (done) ->
    file = client.open('basic-auth-file', { secret: 1000 })
    file.on(TandemClient.File.events.ERROR, (message, errors) ->
      expect(errors).to.include('Access Denied')
      done()
    )
  )

  it('should not find non-existent file', (done) ->
    file = client.open('basic-auth-file-none', { secret: 1337 })
    file.on(TandemClient.File.events.ERROR, (message, errors) ->
      expect(errors).to.include('File not found')
      done()
    )
  )
)
