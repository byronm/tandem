_  = require('underscore')._ if module?
Op = require('./op')


class InsertOp extends Op
  @copy: (subject) ->
    return new InsertOp(subject.value, subject.attributes)

  @isInsert: (i) ->
    return i? && typeof i.value == "string"

  constructor: (@value, attributes = {}) ->
    @attributes = _.clone(attributes)

  getAt: (start, length) ->
    return new InsertOp(@value.substr(start, length), @attributes)

  getLength: ->
    return @value.length

  join: (other) ->
    if _.isEqual(@attributes, other.attributes)
      return new InsertOp(@value + second.value, @attributes)
    else
      throw Error

  split: (offset) ->
    console.assert(offset <= @value.length, "Split called with offset beyond end of insert")
    left = new InsertOp(@value.substr(0, offset), @attributes)
    right = new InsertOp(@value.substr(offset), @attributes)
    return [left, right]

  toString: ->
    return "{#{@value}, #{super()}}"
    
    
module.exports = InsertOp
