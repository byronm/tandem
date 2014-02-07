_       = require('lodash')
async   = require('async')
expect  = require('chai').expect
http    = require('http')
TandemClient = require('../../client')
TandemServer = require('../../../index')

describe('Client File', ->
  httpServer = server = client = null
  
  before( ->
    httpServer = http.createServer()
    httpServer.listen(9090)
    server = new TandemServer.Server(httpServer)
    client = new TandemClient.Client('http://localhost:9090', { latency: 100 })
  )

  after( ->
    httpServer.close()
  )

  it('update', (done) ->
    file = client.open('connect-test')
    async.parallel({
      a: (callback) ->
        file.update(TandemClient.Delta.makeInsertDelta(0, 0, "a"), callback)
      b: (callback) ->
        file.update(TandemClient.Delta.makeInsertDelta(1, 1, "b"), callback)
      c: (callback) ->
        file.update(TandemClient.Delta.makeInsertDelta(2, 2, "c"), callback)
    }, (err, results) ->
      expected = TandemClient.Delta.makeInsertDelta(0, 0, "a")
      expect(results.a.isEqual(expected)).to.be.true
      expected = TandemClient.Delta.makeInsertDelta(0, 0, "abc")
      expect(results.b.isEqual(expected)).to.be.true
      expect(results.c.isEqual(expected)).to.be.true
      done()
    )
  )
)
