# Copyright (c) 2012, Salesforce.com, Inc.  All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# Redistributions of source code must retain the above copyright notice, this
# list of conditions and the following disclaimer.  Redistributions in binary
# form must reproduce the above copyright notice, this list of conditions and
# the following disclaimer in the documentation and/or other materials provided
# with the distribution.  Neither the name of Salesforce.com nor the names of
# its contributors may be used to endorse or promote products derived from this
# software without specific prior written permission.

_       = require('lodash')
expect  = require('chai').expect
TandemServer = require('../../../index')
TandemFile = require('../../../src/server/file')
TandemMemoryCache = require('../../../src/server/cache/memory')


describe('Server File', ->
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
