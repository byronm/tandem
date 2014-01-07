_       = require('underscore')._
expect  = require('chai').expect
TandemServer = require('../../index')
TandemFile = require('../../src/server/file')
TandemMemoryCache = require('../../src/server/cache/memory')


describe('File', ->
  deltas = [
    TandemServer.Delta.makeInsertDelta(0, 0, 'g')
    TandemServer.Delta.makeInsertDelta(1, 1, 'o')
    TandemServer.Delta.makeInsertDelta(2, 2, 'a')
  ]
  TandemMemoryCache.storage['file-test-history'] = [
    JSON.stringify({ version: 1, delta: deltas[0] })
    JSON.stringify({ version: 2, delta: deltas[1] })
    JSON.stringify({ version: 3, delta: deltas[2] })
  ]
  file = null

  before((done) ->
    file = new TandemFile('file-test', TandemServer.Delta.getInitial('go'), 2, {
      cache: TandemMemoryCache
    }, done)
  )

  it('constructor', ->
    expect(file.version).to.equal(3)
    expect(file.versionLoaded).to.equal(0)
    expect(file.head).to.deep.equal(TandemServer.Delta.getInitial('goa'))
  )

  it('sync', (done) ->
    file.sync(0, (err, delta, version) ->
      expect(version).to.equal(3)
      expected = (deltas[0].compose(deltas[1])).compose(deltas[2])
      expect(delta).to.deep.equal(expected)
      done()
    )
  )

  it('transform', (done) ->
    origDelta = TandemServer.Delta.makeInsertDelta(1, 1, 't')
    file.transform(origDelta, 1, (err, delta, version) ->
      expect(version).to.equal(3)
      expected = (origDelta.transform(deltas[1], true)).transform(deltas[2], true)
      expect(delta).to.deep.equal(expected)
      done()
    )
  )

  it('update', (done) ->
    origDelta = TandemServer.Delta.makeInsertDelta(1, 1, 't')
    file.update(origDelta, 1, (err, delta, version) ->
      expect(TandemMemoryCache.storage['file-test-history'].length).to.equal(4)
      expect(file.version).to.equal(4)
      expect(file.head).to.deep.equal(TandemServer.Delta.getInitial('goat'))
      done()
    )
  )
)
