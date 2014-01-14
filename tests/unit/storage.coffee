_       = require('lodash')
async   = require('async')
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
          switch fileId
            when 'basic-auth-file' then callback(null, helloDelta, 10)
            when 'close-file' then callback(null, helloDelta, 10)
            else callback('File not found')
        update: (fileId, head, version, deltas, callback) ->
          eventEmitter.emit('update', head, version, deltas)
          callback(null)
      'check interval': 250
      'inactive timeout': 1000
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
      expect(file.version).to.equal(10)
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
      expect(server.fileManager._files['basic-auth-file'].versionSaved).to.equal(10)
      eventEmitter.on('update', (head, version, deltas) =>
        expect(version).to.equal(11)
        expect(head).to.deep.equal(helloDelta.compose(insertDelta))
        expect(deltas.length).to.equal(1)
        expect(deltas[0]).to.deep.equal(insertDelta)
        eventEmitter.removeAllListeners('update')
        file.close()
        done()
      )
      file.update(insertDelta)
    )
  )

  it('should close file', (done) ->
    file = client.open('close-file', { secret: 1337 })
    file.on(TandemClient.File.events.UPDATE, (delta) ->
      insertDelta = TandemServer.Delta.makeInsertDelta(delta.endLength, 0, 'Oh ')
      cache = server.fileManager._files['close-file'].cache
      async.waterfall([
        (callback) ->
          cache.get('history', callback)
        (history, callback) ->
          expect(history).to.not.exist
          file.update(insertDelta)
          setTimeout(callback, 100)
        (callback) ->
          cache.get('history', callback)
        (history, callback) ->
          expect(history.length).to.equal(1)
          change = JSON.parse(history[0])
          expect(change.version).to.equal(11)
          setTimeout(callback, server.fileManager.settings['inactive timeout'] + 500)
        (callback) ->
          cache.get('history', callback)
        (history, callback) ->
          expect(history).to.not.exist
          callback(null)
      ], (err) ->
        expect(err).to.not.exist
        file.close()
        done()
      )
    )
  )
)
