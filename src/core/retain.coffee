_  = require('underscore')._ if module?
Op = require('./op')


# Used to represent retains in the delta. [inclusive, exclusive)
class RetainOp extends Op
  @copy: (subject) ->
    console.assert(RetainOp.isRetain(subject), "Copy called on non-retain", subject)
    return new RetainOp(subject.start, subject.end, subject.attributes)

  @isRetain: (r) ->
    return r? && typeof r.start == "number" && typeof r.end == "number"

  constructor: (@start, @end, attributes = {}) ->
    console.assert(@start >= 0, "RetainOp start cannot be negative!", @start)
    console.assert(@end >= @start, "RetainOp end must be >= start!", @start, @end)
    @attributes = _.clone(attributes)

  getAt: (start, length) ->
    return new RetainOp(@start + start, @start + start + length, @attributes)

  getLength: ->
    return @end - @start

  split: (offset) ->
    console.assert(offset <= @end, "Split called with offset beyond end of retain")
    left = new RetainOp(@start, @start + offset, @attributes)
    right = new RetainOp(@start + offset, @end, @attributes)
    return [left, right]

  toString: ->
    return "{{#{@start} - #{@end}), #{this.printAttributes()}}"


module.exports = RetainOp
