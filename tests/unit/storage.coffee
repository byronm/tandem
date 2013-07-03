_       = require('underscore')._
expect  = require('chai').expect
http    = require('http')
EventEmitter = require('events').EventEmitter
TandemClient = require('../../client')
TandemServer = require('../../index')

describe('Storage', ->
  httpServer = server = client = null
  helloDelta = TandemServer.Delta.getInitial('Hello World!')
  eventEmitter = new EventEmitter()
  
  before( ->
    httpServer = http.createServer()
    httpServer.listen(9090)
    server = new TandemServer.Server(httpServer, {
      storage:
        authorize: (authPacket, callback) ->
          callback(if authPacket.auth.secret == 1337 then null else "Access Denied")
        find: (fileId, callback) ->
          if fileId == 'basic-auth-file'
            callback(null, helloDelta, 10)
          else
            callback('File not found')
        update: (fileId, head, version, deltas, callback) ->
          eventEmitter.emit('update', head, version, deltas)
          callback(null)
      'save interval': 1000
    })
    client = new TandemClient.Client('http://localhost:9090')
  )

  after( ->
    httpServer.close()
  )

  it('should pass basic auth', (done) ->
    file = client.open('basic-auth-file', { secret: 1337 })
    file.on(TandemClient.File.events.READY, ->
      expect(file.health).to.equal(TandemClient.File.health.HEALTHY)
      file.close()
      done()
    )
  )

  it('should fail basic auth', (done) ->
    file = client.open('basic-auth-file', { secret: 1000 })
    file.on(TandemClient.File.events.ERROR, (message) ->
      expect(message).to.equal('Access Denied')
      file.close()
      done()
    )
  )

  it('should find file', (done) ->
    file = client.open('basic-auth-file', { secret: 1337 })
    file.on(TandemClient.File.events.UPDATE, (delta) ->
      expect(file.engine.version).to.equal(10)
      expect(delta).to.deep.equal(helloDelta)
      file.close()
      done()
    )
  )

  it('should not find non-existent file', (done) ->
    file = client.open('basic-auth-file-none', { secret: 1337 })
    async.parallel({
      client: (callback) =>
        file.on(TandemClient.File.events.ERROR, (message) ->
          expect(message).to.equal("Error retrieving document")
          callback(null)
        )
      server: (callback) =>
        server.on(TandemServer.Server.events.ERROR, (err) ->
          expect(err).to.equal('File not found')
          callback(null)
        )
    }, (err) =>
      file.close()
      done()
    )
  )

  it('should save file', (done) ->
    file = client.open('basic-auth-file', { secret: 1337 })
    file.on(TandemClient.File.events.UPDATE, (delta) ->
      insertDelta = TandemServer.Delta.makeInsertDelta(delta.endLength, 0, 'Oh ')
      eventEmitter.on('update', (head, version, deltas) =>
        expect(version).to.equal(11)
        expect(head).to.deep.equal(helloDelta.compose(insertDelta))
        expect(deltas.length).to.equal(1)
        expect(deltas[0]).to.deep.equal(insertDelta)
        file.close()
        done()
      )
      file.update(insertDelta)
    )
  )
)
