assert     = require('chai').assert
_          = require('underscore')._
Tandem     = require('../index')
Delta      = Tandem.Delta
InsertOp   = Tandem.InsertOp
RetainOp   = Tandem.RetainOp

class DeltaGenerator
  @getRandomString = (alphabet, length) ->
    return _.map([0..(length - 1)], ->
      return alphabet[_.random(0, alphabet.length - 1)]
    ).join('')

  @getRandomLength = ->
    rand = Math.random()
    if rand < 0.6
      return _.random(1, 2)
    else if rand < 0.8
      return _.random(3, 4)
    else if rand < 0.9
      return _.random(5, 9)
    else
      return _.random(10, 50)

  @insertAt: (delta, insertionPoint, insertions) ->
    charIndex = opIndex = 0
    for op in delta.ops
      break if charIndex == insertionPoint
      if insertionPoint < charIndex + op.getLength()
        [head, tail] = op.split(insertionPoint - charIndex)
        delta.ops.splice(opIndex, 1, head, tail)
        opIndex++
        break
      charIndex += op.getLength()
      opIndex++
    delta.ops.splice(opIndex, 0, new InsertOp(insertions))
    delta.endLength += insertions.length
    delta.compact()

  @deleteAt: (delta, deletionPoint, numToDelete) ->
    charIndex = 0
    ops = []
    for op in delta.ops
      if numToDelete > 0 && (charIndex == deletionPoint or deletionPoint < charIndex + op.getLength())
        curDelete = Math.min(numToDelete, op.getLength() - (deletionPoint - charIndex))
        numToDelete -= curDelete
        if Delta.isInsert(op)
          newText = op.value.substring(0, deletionPoint - charIndex) + op.value.substring(deletionPoint - charIndex + curDelete)
          ops.push(new InsertOp(newText)) if newText.length > 0
        else
          console.assert(Delta.isRetain(op), "Expected retain but got: #{op}")
          head = new RetainOp(op.start, op.start + deletionPoint - charIndex, _.clone(op.attributes))
          tail = new RetainOp(op.start + deletionPoint - charIndex + curDelete, op.end, _.clone(op.attributes))
          ops.push(head) if head.start < head.end
          ops.push(tail) if tail.start < tail.end
        deletionPoint += curDelete
      else
        ops.push(op)
      charIndex += op.getLength()
    delta.ops = ops
    delta.endLength = _.reduce(ops, (length, op) ->
      return length + op.getLength()
    , 0)

  @formatAt: (delta, formatPoint, numToFormat, attrs, reference) ->
    charIndex = 0
    ops = []
    for elem in delta.ops
      if numToFormat > 0 && (charIndex == formatPoint || charIndex + elem.getLength() > formatPoint)
        curFormat = Math.min(numToFormat, elem.getLength() - (formatPoint - charIndex))
        numToFormat -= curFormat
        # Split the elem s.t. our formatting change applies to the proper "subelement"
        if Delta.isInsert(elem)
          headStr = elem.value.substring(0, formatPoint - charIndex)
          head = new InsertOp(headStr, _.clone(elem.attributes))
          curStr = elem.value.substring(formatPoint - charIndex, formatPoint - charIndex + curFormat)
          cur = new InsertOp(curStr, _.clone(elem.attributes))
          tailStr = elem.value.substring(formatPoint - charIndex + curFormat)
          tail = new InsertOp(tailStr, _.clone(elem.attributes))
        else
          console.assert(Delta.isRetain(elem), "Expected retain but got #{elem}")
          head = new RetainOp(elem.start, elem.start + formatPoint - charIndex, _.clone(elem.attributes))
          cur = new RetainOp(head.end, head.end + curFormat, _.clone(elem.attributes))
          tail = new RetainOp(cur.end, elem.end, _.clone(elem.attributes))
        ops.push(head) if head.getLength() > 0
        ops.push(cur)
        ops.push(tail) if tail.getLength() > 0
        for attr in attrs
          switch attr
            when 'bold', 'italics'
              if Delta.isInsert(cur)
                if cur.attributes[attr]?
                  delete cur.attributes[attr]
                else
                  cur.attributes[attr] = true
              else
                console.assert Delta.isRetain(cur), "Expected retain but got #{cur}"
                if cur.attributes[attr]?
                  delete cur.attributes[attr]
                else
                  referenceElem = reference.getOpsAt(cur.start, cur.end - cur.start)
                  if referenceElem[0].attributes[attr]?
                    console.assert referenceElem[0].attributes[attr], "Boolean attribute on reference delta should only be true!"
                    cur.attributes[attr] = null
                  else
                    cur.attributes[attr] = true
            when 'fontsize'
              getRandFontSize = -> Math.floor(Math.random() * 24)
              if Delta.isInsert(cur)
                cur.attributes[attr] = getRandFontSize()
              else
                console.assert(Delta.isRetain(cur),
                  "Expected retain but got #{cur}")
                if cur.attributes[attr]?
                  if Math.random() < 0.5
                    delete cur.attributes[attr]
                  else
                    cur.attributes[attr] = getRandFontSize()
                else
                  cur.attributes[attr] = getRandFontSize()
            else
              console.assert false, "Received unknown attribute: #{attr}"
        formatPoint += curFormat
      else
        ops.push(elem)
      charIndex += elem.getLength()
    delta.endLength = _.reduce(ops, (length, delta) ->
      return length + delta.getLength()
    , 0)
    delta.ops = ops
    delta.compact()

  @addRandomOp: (newDelta, startDelta, alphabet) ->
    finalIndex = startDelta.endLength - 1
    opIndex = _.random(0, finalIndex)
    rand = Math.random()
    if rand < 0.5
      opLength = getRandomLength()
      this.insertAt(newDelta, opIndex, this.getRandomString(alphabet, opLength))
    else if rand < 0.75
      opLength = _.random(1, finalIndex - opIndex)
      this.deleteAt(newDelta, opIndex, opLength)
    else
      attributes = ["bold", "italics", "fontsize"]
      # Pick a random number of random attributes
      attributes.sort(-> return 0.5 - Math.random())
      numAttrs = _.random(0, attributes.length)
      attrs = attributes.slice(0, numAttrs)
      opLength = _.random(1, finalIndex - opIndex)
      this.formatAt(newDelta, opIndex, opLength, attrs, startDelta)
    return newDelta

  @getRandomDelta: (startDelta, alphabet, numOps) ->
    newDelta = new Delta(startDelta.endLength,
                         startDelta.endLength,
                         [new RetainOp(0,
                                       startDelta.endLength)])
    numOps or= _.random(1, 10)
    for i in [0...numOps]
      @addRandomOp(newDelta, startDelta, alphabet)
    return newDelta

module.exports = DeltaGenerator
