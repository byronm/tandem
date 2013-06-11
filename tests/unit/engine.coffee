_       = require('underscore')._
expect  = require('chai').expect
TandemServer = require('../../index')
TandemMemoryCache = require('../../src/server/cache/memory')


describe('Engine', ->
  deltas = [
    TandemServer.Delta.makeInsertDelta(0, 0, 'g')
    TandemServer.Delta.makeInsertDelta(1, 1, 'o')
    TandemServer.Delta.makeInsertDelta(2, 2, 'a')
  ]
  TandemMemoryCache.storage['engine-test-history'] = [
    JSON.stringify({ version: 1, delta: deltas[0] })
    JSON.stringify({ version: 2, delta: deltas[1] })
    JSON.stringify({ version: 3, delta: deltas[2] })
  ]
  engine = null

  before((done) ->
    engine = new TandemServer.Engine('engine-test', TandemServer.Delta.getInitial('go'), 2, {
      cache: TandemMemoryCache
    }, done)
  )

  it('constructor', ->
    expect(engine.version).to.equal(3)
    expect(engine.versionLoaded).to.equal(1)
    expect(engine.head).to.deep.equal(TandemServer.Delta.getInitial('goa'))
  )

  it('getDeltaSince', (done) ->
    engine.getDeltaSince(1, (err, delta, version) ->
      expect(version).to.equal(3)
      expected = (deltas[0].compose(deltas[1])).compose(deltas[2])
      expect(delta).to.deep.equal(expected)
      done()
    )
  )

  it('transform', (done) ->
    origDelta = TandemServer.Delta.makeInsertDelta(1, 1, 't')
    engine.transform(origDelta, 1, (err, delta, version) ->
      expect(version).to.equal(3)
      expected = (origDelta.follows(deltas[1], true)).follows(deltas[2], true)
      expect(delta).to.deep.equal(expected)
      done()
    )
  )

  it('update', (done) ->
    origDelta = TandemServer.Delta.makeInsertDelta(1, 1, 't')
    engine.update(origDelta, 1, (err, delta, version) ->
      expect(TandemMemoryCache.storage['engine-test-history'].length).to.equal(4)
      expect(engine.version).to.equal(4)
      expect(engine.head).to.deep.equal(TandemServer.Delta.getInitial('goat'))
      done()
    )
  )
)
