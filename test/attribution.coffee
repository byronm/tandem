should    = require('should')
util      = require('util')

jetsync   = require('../../lib/jetsync')
Tandem    = jetsync.Tandem
Delta     = Tandem.Delta
InsertOp  = Tandem.InsertOp
RetainOp  = Tandem.RetainOp

describe('compose', ->
  describe('attributes', ->
    it('should compose a text append by another author', ->
      deltaA = new Delta(0, 1, [
        new InsertOp("a", {authorId: 'Timon'})
      ])
      deltaB = new Delta(1, 2, [
        new RetainOp(0, 1, {authorId: 'Timon'})
        new InsertOp("b", {authorId: 'Pumba'})
      ])
      composed = deltaA.compose(deltaB)
      expected = new Delta(0, 2, [
        new InsertOp("a", {authorId: 'Timon'})
        new InsertOp("b", {authorId: 'Pumba'})
      ])
      composed.should.eql(expected)
    )

    it('should compose a text replacement by another author', ->
      deltaA = new Delta(0, 1, [
        new InsertOp("a", {authorId: 'Timon'})
      ])
      deltaB = new Delta(1, 2, [
        new InsertOp("Ab", {authorId: 'Pumba'})
      ])
      composed = deltaA.compose(deltaB)
      expected = new Delta(0, 2, [
        new InsertOp("Ab", {authorId: 'Pumba'})
      ])
      composed.should.eql(expected)
    )

    it('should compose a same text replacement by another author', ->
      deltaA = new Delta(0, 1, [
        new InsertOp("a", {authorId: 'Timon'})
      ])
      deltaB = new Delta(1, 2, [
        new RetainOp(0, 1, {authorId: 'Pumba'})
        new InsertOp("b", {authorId: 'Pumba'})
      ])
      composed = deltaA.compose(deltaB)
      expected = new Delta(0, 2, [
        new InsertOp("ab", {authorId: 'Pumba'})
      ])
      composed.should.eql(expected)
    )
  )
)
