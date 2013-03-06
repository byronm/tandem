class DeltaGenerator
  insertAt = (delta, insertionPoint, insertions) ->
    charIndex = elemIndex = 0
    for elem in delta.ops
      break if charIndex == insertionPoint
      if insertionPoint < charIndex + elem.getLength()
        [head, tail] = elem.split(insertionPoint - charIndex)
        delta.ops.splice(elemIndex, 1, head, tail)
        elemIndex++
        break
      charIndex += elem.getLength()
      elemIndex++
    delta.ops.splice(elemIndex, 0, new InsertOp(insertions))
    delta.endLength += insertions.length
    delta.compact()

  @getRandomDelta: (startDelta, alphabet, format) ->
    newDelta = Delta.copy(startDelta)
    finalIndex = startDelta.endLength - 1
    opIndex = _.random(0, finalIndex)
    rand = Math.random()
    if rand < 0.5
      opLength = Scribe.Debug.Test.getRandomLength() + 1
      insertAt(newDelta, opIndex, opLength)
    else if rand < 0.75
      opLength = _.random(1, finalIndex - index)
      delteAt(newDelta, opIndex, opLength)
    else
      opLength = _.random(1, finalIndex - index)
      formatAt(newDelta, opIndex, opLength)
    return newDelta
