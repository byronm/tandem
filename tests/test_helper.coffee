class DeltaGenerator
  getRandomString = (alphabet, length) ->
    return _.map([0..(length - 1)], ->
      return alphabet[_.random(0, alphabet.length - 1)]
    ).join('')

  getRandomLength = ->
    rand = Math.random()
    if rand < 0.1
      return 1
    else if rand < 0.6
      return _.random(0, 2)
    else if rand < 0.8
      return _.random(3, 4)
    else if rand < 0.9
      return _.random(5, 9)
    else
      return _.random(10, 50)

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
      opLength = getRandomLength() + 1
      insertAt(newDelta, opIndex, getRandomString(alphabet, opLength))
    else if rand < 0.75
      opLength = _.random(1, finalIndex - index)
      deleteAt(newDelta, opIndex, opLength)
    else
      opLength = _.random(1, finalIndex - index)
      formatAt(newDelta, opIndex, opLength)
    return newDelta
