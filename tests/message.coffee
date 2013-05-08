_       = require('underscore')._
expect  = require('chai').expect
http    = require('http')
TandemClient = require('../client')
TandemServer = require('../index')

Storage =
  authorize: (authPacket, callback) ->
    return callback(null)
  find: (fileId, callback) ->
    switch fileId
      when 'sync-test'
        return callback(null, new TandemServer.Delta.getInitial('sync'), 5)
      when 'update-test'
        return callback(null, new TandemServer.Delta.getInitial('a'), 5)
      when 'resync-test'
        return callback(null, new TandemServer.Delta.getInitial('resync'), 10)
      else
        return callback(null, new TandemServer.Delta.getInitial(''), 0)
  update: (fileId, head, version, callback) ->
    return callback(null)

describe('Messaging', ->
  httpServer = server = client1 = client2 = null
  
  before( ->
    httpServer = http.createServer()
    httpServer.listen(9090)
    server = new TandemServer.Server(httpServer, { storage: Storage })
    client1 = new TandemClient.Client('http://localhost:9090')
    client2 = new TandemClient.Client('http://localhost:9090')
  )

  after( ->
    httpServer.close()
  )

  it('should sync', (done) ->
    file = client1.open('sync-test')
    file.on(TandemClient.File.events.UPDATE, (delta) ->
      Storage.find('sync-test', (err, head, version) ->
        expect(delta).to.deep.equal(head)
        done()
      )
    )
  )

  it('should broadcast', (done) ->
    file1 = client1.open('broadcast-test')
    file2 = client2.open('broadcast-test')
    message = { message: "Hello World!" }
    file2.on(TandemClient.File.events.READY, ->
      file1.broadcast('custom', message)
    ).on('custom', (packet) ->
      message.userId = packet.userId
      expect(packet).to.deep.equal(message)
      done()
    )
  )

  it('should update', (done) ->
    file1 = client1.open('update-test')
    file2 = client2.open('update-test')
    updateDelta = new TandemClient.Delta(1, [
      new TandemClient.RetainOp(0, 1)
      new TandemClient.InsertOp('b')
    ])
    onReady = _.after(2, ->
      file1.update(updateDelta)
    )
    file1.on(TandemClient.File.events.READY, onReady)
    file2.on(TandemClient.File.events.READY, onReady)
    sync = true
    file2.on(TandemClient.File.events.UPDATE, (delta) ->
      if sync == true
        sync = false
      else
        expect(delta).to.deep.equal(updateDelta)
        done()
    )
  )

  it('should resync', (done) ->
    file = client1.open('resync-test')
    file.engine.arrived = new TandemClient.Delta.getInitial('a')
    file.once(TandemClient.File.events.UPDATE, ->
      expect(file.health).to.equal(TandemClient.File.health.WARNING)
      file.on(TandemClient.File.events.HEALTH, (newHealth, oldHealth) ->
        expect(newHealth).to.equal(TandemClient.File.health.HEALTHY)
        Storage.find('resync-test', (err, head, version) ->
          expect(file.engine.arrived).to.deep.equal(head)
          done()
        )
      )
    )
  )
)
