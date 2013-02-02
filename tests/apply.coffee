_         = require('underscore')._
expect    = require('chai').expect

Tandem    = require('../src/core/tandem')
Delta     = Tandem.Delta
InsertOp  = Tandem.InsertOp
RetainOp  = Tandem.RetainOp


class StringEditor
  constructor: (@text = "") ->

  insert: (index, text) ->
    @text = @text.slice(0, index) + text + @text.slice(index)

  delete: (index, length) ->
    @text = @text.slice(0, index) + @text.slice(index + length)

  format: ->


tests = [{
  name: 'should insert text'
  start: 'Hello'
  delta: new Delta(5, 12, [
    new RetainOp(0, 5)
    new InsertOp(' World!')
  ])
  expected: 'Hello World!'
}, {
  name: 'should delete text'
  start: 'Hello World!'
  delta: new Delta(12, 5, [
    new RetainOp(0, 5)
  ])
  expected: 'Hello'
}]


describe('apply', ->
  _.each(tests, (test) ->
    it(test.name, ->
      editor = new StringEditor(test.start)
      test.delta.apply(editor.insert, editor.delete, editor.format, editor)
    )
  )
)
