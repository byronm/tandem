# Unit tests for the synchronization library, sync.coffee
assert     = require('chai').assert
_          = require('underscore')._
Tandem     = require('../index')
Delta      = Tandem.Delta
InsertOp   = Tandem.InsertOp
RetainOp   = Tandem.RetainOp
testNumber = 0

##############################
# Test decompose
##############################
testDecompose = (deltaA, deltaC, expectedDecomposed) ->
  return unless _.all(deltaA.ops, ((op) -> return op.value?))
  return unless _.all(deltaC.ops, ((op) -> return op.value?))
  decomposed = deltaC.decompose(deltaA)
  decomposeError = """Incorrect decomposition. Got: #{decomposed.toString()},
                    expected: #{expectedDecomposed.toString()}"""
  assert(expectedDecomposed.isEqual(decomposed), decomposeError)

describe('decompose', ->
  # Basic edit tests
  it('should append', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaC = new Delta(0, 6, [new InsertOp("abcdef")])
    expectedDecomposed = new Delta(3, 6, [new RetainOp(0, 3), new InsertOp("def")])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should prepend', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaC = new Delta(0, 6, [new InsertOp("defabc")])
    expectedDecomposed = new Delta(3, 6, [new InsertOp("def"), new RetainOp(0, 3)])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should insert to the middle', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaC = new Delta(0, 6, [new InsertOp("abdefc")])
    expectedDecomposed = new Delta(3, 6, [new RetainOp(0, 2), new InsertOp("def"), new RetainOp(2, 3)])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should yield alternating inserts', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaC = new Delta(0, 6, [new InsertOp("azbzcz")])
    expectedDecomposed = new Delta(3, 6, [new RetainOp(0, 1), new InsertOp("z"), new RetainOp(1, 2), new InsertOp("z"), new RetainOp(2, 3), new InsertOp("z")])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should replace the tail', ->
    deltaA = new Delta(0, 6, [new InsertOp("abcdef")])
    deltaC = new Delta(0, 6, [new InsertOp("abc123")])
    expectedDecomposed = new Delta(6, 6, [new RetainOp(0, 3), new InsertOp("123")])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should delete the tail and prepend to the head', ->
    deltaA = new Delta(0, 6, [new InsertOp("abcdef")])
    deltaC = new Delta(0, 6, [new InsertOp("123abc")])
    expectedDecomposed = new Delta(6, 6, [new InsertOp("123"), new RetainOp(0, 3)])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should delete the head and append to the tail', ->
    deltaA = new Delta(0, 6, [new InsertOp("abcdef")])
    deltaC = new Delta(0, 6, [new InsertOp("def123")])
    expectedDecomposed = new Delta(6, 6, [new RetainOp(3, 6), new InsertOp("123")])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should replace the head', ->
    deltaA = new Delta(0, 6, [new InsertOp("abcdef")])
    deltaC = new Delta(0, 6, [new InsertOp("123def")])
    expectedDecomposed = new Delta(6, 6, [new InsertOp("123"), new RetainOp(3, 6)])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should trim the first and last chars', ->
    deltaA = new Delta(0, 6, [new InsertOp("abcdef")])
    deltaC = new Delta(0, 4, [new InsertOp("bcde")])
    expectedDecomposed = new Delta(6, 4, [new RetainOp(1, 5)])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should delete from the middle', ->
    deltaA = new Delta(0, 6, [new InsertOp("abcdef")])
    deltaC = new Delta(0, 4, [new InsertOp("adef")])
    expectedDecomposed = new Delta(6, 4, [new RetainOp(0, 1), new RetainOp(3, 6)])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should replace all', ->
    deltaA = new Delta(0, 6, [new InsertOp("abcdef")])
    deltaC = new Delta(0, 6, [new InsertOp("123456")])
    expectedDecomposed = new Delta(6, 6, [new InsertOp("123456")])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  # Empty string tests
  it('should append to the empty string', ->
    deltaA = new Delta(0, 0, [new InsertOp("")])
    deltaC = new Delta(0, 3, [new InsertOp("abc")])
    expectedDecomposed = new Delta(0, 3, [new InsertOp("abc")])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should append to the empty string', ->
    deltaA = new Delta(0, 0, [])
    deltaC = new Delta(0, 3, [new InsertOp("abc")])
    expectedDecomposed = new Delta(0, 3, [new InsertOp("abc")])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should append the empty string', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaC = new Delta(0, 0, [new InsertOp("")])
    expectedDecomposed = new Delta(3, 0, [])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should append the empty string', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaC = new Delta(0, 0, [])
    expectedDecomposed = new Delta(3, 0, [])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should append the empty string to the empty string', ->
    deltaA = new Delta(0, 0, [])
    deltaC = new Delta(0, 0, [])
    expectedDecomposed = new Delta(0, 0, [])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should append the empty string to the empty string', ->
    deltaA = new Delta(0, 0, [])
    deltaC = new Delta(0, 0, [new InsertOp("")])
    expectedDecomposed = new Delta(0, 0, [new InsertOp("")])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  # Attribution tests
  it('should append adjacent attributes', ->
    deltaA = new Delta(0, 0, [])
    deltaC = new Delta(0, 6, [new InsertOp("ab"),
                              new InsertOp("cd", {bold: true}),
                              new InsertOp("ef", {italics: true})])
    expectedDecomposed = new Delta(0, 6, [new InsertOp("ab"),
                                          new InsertOp("cd", {bold: true}),
                                          new InsertOp("ef", {italics: true})])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should retain text with no attributes when no attribution changes have been made', ->
    deltaA = new Delta(0, 2, [new InsertOp("ab")])
    deltaC = new Delta(0, 6, [new InsertOp("ab"),
                              new InsertOp("cd", {bold: true}),
                              new InsertOp("ef", {italics: true})])
    expectedDecomposed = new Delta(2, 6, [new RetainOp(0, 2),
                                          new InsertOp("cd", {bold: true}),
                                          new InsertOp("ef", {italics: true})])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should retain text with attributes when attribution changes have been made', ->
    deltaA = new Delta(0, 6, [new InsertOp("abcdef")])
    deltaC = new Delta(0, 6, [new InsertOp("a", {bold: true}),
                              new InsertOp("b", {bold: true, italics: true}),
                              new InsertOp("cd", {underline: true}),
                              new InsertOp("ef")])
    expectedDecomposed = new Delta(6, 6, [new RetainOp(0, 1, {bold: true}),
                                          new RetainOp(1, 2, {bold:true, italics: true}),
                                          new RetainOp(2, 4, {underline: true}),
                                          new RetainOp(4, 6)])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  # Test that we favor retains over inserts
  it('should retain the middle', ->
    deltaA = new Delta(0, 6, [new InsertOp("abczde")])
    deltaC = new Delta(0, 6, [new InsertOp("zabcde")])
    expectedDecomposed = new Delta(6, 6, [new InsertOp("z"), new RetainOp(0, 3), new RetainOp(4, 6)])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should retain the middle', ->
    deltaA = new Delta(0, 5, [new InsertOp("abcde")])
    deltaC = new Delta(0, 5, [new InsertOp("zbcd1")])
    expectedDecomposed = new Delta(5, 5, [new InsertOp("z"), new RetainOp(1, 4), new InsertOp("1")])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should retain the tail', ->
    deltaA = new Delta(0, 8, [new InsertOp("xbyabcde")])
    deltaC = new Delta(0, 6, [new InsertOp("zabcde")])
    expectedDecomposed = new Delta(8, 6, [new InsertOp("z"), new RetainOp(3, 8)])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )

  it('should yield the minimal decomposition', ->
    deltaA = new Delta(0, 3, [new InsertOp("ab", {bold: true}),
                              new InsertOp("c")])
    deltaC = new Delta(0, 4, [new InsertOp("a", {bold: true}),
                              new InsertOp("c"),
                              new InsertOp("b", {bold: true})
                              new InsertOp("c")])

    expectedDecomposed = new Delta(3, 4, [new RetainOp(0, 1),
                                          new InsertOp("c"),
                                          new RetainOp(1, 3)])
    testDecompose(deltaA, deltaC, expectedDecomposed)
  )
)

##############################
# Test compose/decompose
##############################
testComposeAndDecompose = (deltaA, deltaB, expectedComposed, expectedDecomposed) ->
  composed = deltaA.compose(deltaB)
  composeError =  "Incorrect composition. Got: #{composed.toString()}, expected: #{expectedComposed.toString()}"
  assert(composed.isEqual(expectedComposed), composeError)
  return unless _.all(deltaA.ops, ((op) -> return op.value?))
  return unless _.all(composed.ops, ((op) -> return op.value?))
  decomposed = composed.decompose(deltaA)
  decomposeError = """Incorrect decomposition. Got: #{decomposed.toString()},
                    expected: #{expectedDecomposed.toString()}"""
  assert(decomposed.isEqual(expectedDecomposed), decomposeError)

describe('compose', ->

  it('should append', ->
    deltaA = new Delta(0, 5, [new InsertOp("hello")])
    deltaB = new Delta(5, 11, [new RetainOp(0, 5), new InsertOp(" world")])
    expectedComposed = new Delta(0, 11, [new InsertOp("hello world")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should prepend', ->
    deltaA = new Delta(0, 1, [new InsertOp("a")])
    deltaB = new Delta(1, 3, [new InsertOp("bb"), new RetainOp(0, 1)])
    expectedComposed = new Delta(0, 3, [new InsertOp("bba")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should insert to the middle', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 6, [new RetainOp(0, 1), new InsertOp("123"), new RetainOp(1, 3)])
    expectedComposed = new Delta(0, 6, [new InsertOp("a123bc")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should insert newlines', ->
    deltaA = new Delta(0, 7, [new InsertOp("abc\ndef")])
    deltaB = new Delta(7, 8, [new RetainOp(0, 1), new InsertOp("\n"), new RetainOp(1, 7)])
    expectedComposed = new Delta(0, 8, [new InsertOp("a\nbc\ndef")])
    expectedDecomposed = new Delta(7, 8, [new RetainOp(0, 1), new InsertOp("\n"), new RetainOp(1, 7)])
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should handle newlines following an attribution and ending the doc', ->
    deltaA = new Delta(0, 4, [new InsertOp("ab"), new InsertOp("c", {bold: true}), new InsertOp("\n")])
    deltaC = new Delta(0, 3, [new InsertOp("ab\n")])
    decomposed = deltaC.decompose(deltaA)
    composed = deltaA.compose(decomposed)
    assert(deltaC.isEqual(composed))
  )

  it('should handle newlines following an attribution and not ending the doc', ->
    deltaA = new Delta(0, 7, [new InsertOp("ab"), new InsertOp("c", {bold: true}), new InsertOp("\ndef")])
    deltaC = new Delta(0, 6, [new InsertOp("ab\ndef")])
    decomposed = deltaC.decompose(deltaA)
    composed = deltaA.compose(decomposed)
    assert(deltaC.isEqual(composed))
  )

  it('should insert a character that appears later in the original document', ->
    deltaA = new Delta(0, 5, [new InsertOp("abczd")])
    deltaB = new Delta(5, 6, [new RetainOp(0, 1), new InsertOp("z"), new
    RetainOp(1, 5)])
    expectedComposed = new Delta(0, 6, [new InsertOp("azbczd")])
    expectedDecomposed = new Delta(5, 6, [new RetainOp(0, 1), new InsertOp("z"), new
    RetainOp(1, 5)])
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should pass a specific fuzzer test we once failed', ->
    deltaA = new Delta(43, 43, [new RetainOp(0, 43)])
    deltaB = new Delta(43, 77, [
      new RetainOp(0, 2), new InsertOp("fbnuethzmh"),
      new RetainOp(2, 23), new InsertOp("vaufgrwnowolht"), new RetainOp(23, 31),
      new InsertOp("j"), new RetainOp(31, 37),
      new InsertOp("bagcfe"), new RetainOp(37, 40),
      new InsertOp("koo"), new RetainOp(40, 43)
    ], 2)
    expectedComposed = new Delta(43, 77, [
      new RetainOp(0, 2), new InsertOp("fbnuethzmh"), new
      RetainOp(2, 23), new InsertOp("vaufgrwnowolht"), new RetainOp(23, 31),
      new InsertOp("j"), new RetainOp(31, 37), new
      InsertOp("bagcfe"), new RetainOp(37, 40), new
      InsertOp("koo"), new RetainOp(40, 43)
    ], 2)
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should pass a specific fuzzer test we once failed', ->
    # Test a specific fuzzer test we once failed
    deltaA = new Delta(43, 43, [new RetainOp(0, 43)])
    deltaB = new Delta(43, 77, [
      new RetainOp(0, 2), new InsertOp("fbnuethzmh"),
      new RetainOp(2, 23), new InsertOp("vaufgrwnowolht"), new RetainOp(23, 31),
      new InsertOp("j"), new RetainOp(31, 37),
      new InsertOp("bagcfe"), new RetainOp(37, 40),
      new InsertOp("koo"), new RetainOp(40, 43)
    ], 2)
    composed = deltaA.compose(deltaB)
    expectedComposed = new Delta(43, 77, [
      new RetainOp(0, 2), new InsertOp("fbnuethzmh"), new
      RetainOp(2, 23), new InsertOp("vaufgrwnowolht"), new RetainOp(23, 31),
      new InsertOp("j"), new RetainOp(31, 37), new
      InsertOp("bagcfe"), new RetainOp(37, 40), new
      InsertOp("koo"), new RetainOp(40, 43)
    ], 2)
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should delete the entire document', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 0, [])
    expectedComposed = new Delta(0, 0, [])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should delete the final char', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 2, [new RetainOp(0, 2)])
    expectedComposed = new Delta(0, 2, [new InsertOp("ab")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should delete the tail', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 1, [new RetainOp(0, 1)])
    expectedComposed = new Delta(0, 1, [new InsertOp("a")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should delete the first char', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 2, [new RetainOp(1, 3)])
    expectedComposed = new Delta(0, 2, [new InsertOp("bc")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should delete the middle characters', ->
    deltaA = new Delta(0, 4, [new InsertOp("abcd")])
    deltaB = new Delta(4, 2, [new RetainOp(0, 1), new RetainOp(3, 4)])
    expectedComposed = new Delta(0, 2, [new InsertOp("ad")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should append when there is a retain', ->
    deltaA = new Delta(3, 5, [new InsertOp("dd"), new RetainOp(0, 3)])
    deltaB = new Delta(5, 7, [new RetainOp(0, 5), new InsertOp("ee")])
    expectedComposed = new Delta(3, 7, [new InsertOp("dd"), new RetainOp(0, 3), new InsertOp("ee")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should prepend a character when the trailing string is a multichar match', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 4, [new InsertOp("d"), new RetainOp(0, 3)])
    expectedComposed = new Delta(0, 4, [new InsertOp("dabc")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should appending a character when preceding string is multichar match', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 4, [new RetainOp(0, 3), new InsertOp("d")])
    expectedComposed = new Delta(0, 4, [new InsertOp("abcd")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should handle when when deltaA has a retain', ->
    deltaA = new Delta(3, 6, [new RetainOp(0, 3), new InsertOp("abc")])
    deltaB = new Delta(6, 8, [new RetainOp(0, 6), new InsertOp("de")])
    expectedComposed = new Delta(3, 8, [new RetainOp(0, 3), new InsertOp("abcde")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should handle when deltaA has non-contiguous retains', ->
    deltaA = new Delta(6, 12, [new RetainOp(0, 3), new InsertOp("abc"), new RetainOp(3, 6), new InsertOp("def")])
    deltaB = new Delta(12, 18, [new InsertOp("123"), new RetainOp(0, 3), new InsertOp("456"), new RetainOp(3, 12)])
    expectedComposed = new Delta(6, 18, [new InsertOp("123"), new RetainOp(0,
      3), new InsertOp("456abc"), new RetainOp(3, 6), new InsertOp("def")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should handle an insertion, followed by a retain, followed by a deletion', ->
    deltaA = new Delta(0, 4, [new InsertOp("abcd")])
    deltaB = new Delta(4, 4, [new InsertOp("d"), new RetainOp(0, 3)])
    expectedComposed = new Delta(0, 4, [new InsertOp("dabc")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should handle a retain followed by an insert', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 6, [new RetainOp(1, 3), new InsertOp("defg")])
    expectedComposed = new Delta(0, 6, [new InsertOp("bcdefg")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should replace existing text with the same text', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 2, [new InsertOp("bc")])
    expectedComposed = new Delta(0, 2, [new InsertOp("bc")])
    expectedDecomposed = new Delta(3, 2, [new RetainOp(1, 3)])
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should delete retained text', ->
    deltaA = new Delta(0, 4, [new RetainOp(0, 4)])
    deltaB = new Delta(4, 0, [])
    expectedComposed = new Delta(0, 0, [])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  # Attribution tests
  it('should apply bold to inserted text', ->
    deltaA = new Delta(0, 3, [new InsertOp("cat")])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    expectedComposed = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should keep attribution on inserted text after a retain', ->
    deltaA = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3)])
    expectedComposed = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should not remove an attribute if it is retained with undefined', ->
    deltaA = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {bold: undefined})])
    expectedComposed = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
    expectedDecomposed = new Delta(3, 3, [new RetainOp(0, 3, {})])
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should apply bold to retained text', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3)])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should keep attribution on retained text after a retain', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3)])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should not remove an attribute if it is retained with undefined', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {bold: undefined})])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    expectedDecomposed = new Delta(3, 3, [new RetainOp(0, 3, {})])
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should remove attribution on inserted text if it is retained with null', ->
    deltaA = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    expectedComposed = new Delta(0, 3, [new InsertOp("cat")])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should remove attribution on retained text if it is retained with null', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should take the final value when the same attribute is retained multiple times', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3, {fontsize: 3})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {fontsize: 5})])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {fontsize: 5})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should overwrite an attribute\'s value when inserted text is retained with a different value for the same attribute', ->
    deltaA = new Delta(3, 3, [new InsertOp("abc", {fontsize: 3})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {fontsize: 5})])
    expectedComposed = new Delta(3, 3, [new InsertOp("abc", {fontsize: 5})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should support multiple attributes on the same set of characters', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {italic: true})])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {bold: true, italic: true})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )


  it('should support multiple attributes on the same set of characters', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {italic: true, underline: true})])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {bold: true, italic: true, underline: true})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should support adding and removing attributes from the same inserted characters in the same delta', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {italic: true, underline: true, bold: null})])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {italic: true, underline: true, bold: null})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should support adding and removing attributes from the same retained characters in the same delta', ->
    deltaA = new Delta(3, 3, [new InsertOp("abc", {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {italic: true, underline: true, bold: null})])
    expectedComposed = new Delta(3, 3, [new InsertOp("abc", {italic: true, underline: true})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should persist null attribute if nothing to remove', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3)])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    expectedDecomposed = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should delete the head with attribution', ->
    deltaA = new Delta(0, 11, [new InsertOp("bold", {bold: true}), new InsertOp("italics", {italics: true})])
    deltaC = new Delta(0, 7, [new InsertOp("italics", {italics: true})])
    decomposed = deltaC.decompose(deltaA)
    composed = deltaA.compose(decomposed)
    assert(composed.isEqual(deltaC))
  )

  # Nested composition tests, i.e., compose(a, compose(b, c))
  it('should handle nested compositions', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3)])
    deltaC = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    expectedDecomposed = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    testComposeAndDecompose(deltaA, deltaB.compose(deltaC), expectedComposed, expectedDecomposed)
  )

  it('should handle nested compositions', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3)])
    deltaC = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    deltaD = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    assert(expectedComposed.isEqual(deltaA.compose(deltaB.compose(deltaC.compose(deltaD)))))
    assert(expectedComposed.isEqual(deltaA.compose(deltaB.compose(deltaC)).compose(deltaD)))
    assert(expectedComposed.isEqual((deltaA.compose(deltaB)).compose(deltaC.compose(deltaD))))
  )

  it('should handle nested compositions', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    deltaC = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    deltaD = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    assert(expectedComposed.isEqual(deltaA.compose(deltaB.compose(deltaC.compose(deltaD)))))
  )

  it('should handle nested compositions', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    deltaC = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    deltaD = new Delta(3, 3, [new RetainOp(0, 3, {bold: true})])
    deltaE = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
    expectedComposed = new Delta(0, 3, [new InsertOp("abc")])
    assert(expectedComposed.isEqual((deltaA.compose(deltaB.compose(deltaC.compose(deltaD)))).compose(deltaE)))
  )

  it('should handle nested compositions', ->
    deltaA = new Delta(3, 3, [new RetainOp(0, 3, {fontsize: 3})])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {fontsize: 5})])
    deltaC = new Delta(3, 3, [new RetainOp(0, 3)])
    deltaD = new Delta(3, 3, [new RetainOp(0, 3, {fontsize: null})])
    expectedComposed = new Delta(3, 3, [new RetainOp(0, 3, {fontsize: null})])
    assert(expectedComposed.isEqual((deltaA.compose(deltaB.compose(deltaC.compose(deltaD))))))
  )

  it('should handle nested compositions', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 3, [new RetainOp(0, 3, {fontsize: 3})])
    deltaC = new Delta(3, 3, [new RetainOp(0, 3, {fontsize: 5})])
    deltaD = new Delta(3, 3, [new RetainOp(0, 3)])
    deltaE = new Delta(3, 3, [new RetainOp(0, 3, {fontsize: null})])
    expectedComposed = new Delta(0, 3, [new InsertOp("abc")])
    assert(expectedComposed.isEqual(deltaA.compose(deltaB.compose(deltaC.compose(deltaD.compose(deltaE))))))
  )

  # Test decompose + author attribution
  # TODO: Move these into attribution test module?
  it('should attribute adjacent authors', ->
    deltaA = new Delta(0, 1, [
            new InsertOp("a", {authorId: 'Timon'})
          ])
    deltaB = new Delta(1, 2, [
               new RetainOp(0, 1)
               new InsertOp("b", {authorId: 'Pumba'})
          ])
    expectedComposed = new Delta(0, 2, [
                       new InsertOp("a", {authorId: 'Timon'})
                       new InsertOp("b", {authorId: 'Pumba'})
                  ])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should replace author attribute', ->
    deltaA = new Delta(0, 1, [
             new InsertOp("a", {authorId: 'Timon'})
          ])
    deltaB = new Delta(1, 2, [
              new InsertOp("Ab", {authorId: 'Pumba'})
          ])
    expectedComposed = new Delta(0, 2, [
             new InsertOp("Ab", {authorId: 'Pumba'})
          ])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should replace author attribute', ->
    deltaA = new Delta(0, 1, [
             new InsertOp("a", {authorId: 'Timon'})
    ])
    deltaB = new Delta(1, 2, [
               new RetainOp(0, 1, {authorId: 'Pumba'})
               new InsertOp("b", {authorId: 'Pumba'})
    ])
    expectedComposed = new Delta(0, 2, [
                       new InsertOp("ab", {authorId: 'Pumba'})
    ])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should handle adding attribution to the middle of the document', ->
    deltaA = new Delta(10, 10, [new RetainOp(0, 10)])
    deltaB = new Delta(10, 10, [new RetainOp(0,3), new RetainOp(3,6,{bold:true}), new RetainOp(6,10)])
    composed = deltaA.compose(deltaB)
    assert(deltaB.isEqual(composed))
  )

  ##############################
  # Test Recursive Attributes
  ##############################
  it('shoud propagate recursive attributes through a retain', ->
    deltaA = new Delta(0, 1, [new InsertOp("a", {outer: {color: 'red'}})])
    deltaB = new Delta(1, 1, [new RetainOp(0, 1, {})])
    expectedComposed = new Delta(0, 1, [new InsertOp("a", {outer: {color: 'red'}})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should overwrite recursive attribute through retain with new attr val', ->
    deltaA = new Delta(0, 1, [new InsertOp("a", {outer: {color: 'red'}})])
    deltaB = new Delta(1, 1, [new RetainOp(0, 1, {outer: {color: 'blue'}})])
    expectedComposed = new Delta(0, 1, [new InsertOp("a", {outer: {color: 'blue'}})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should add new attributes to recursive attributes', ->
    deltaA = new Delta(0, 1, [new InsertOp("a", {outer: {color: 'red'}})])
    deltaB = new Delta(1, 1, [new RetainOp(0, 1, {outer: {bold: true}})])
    expectedComposed = new Delta(0, 1, [new InsertOp("a", {outer: {color: 'red', bold: true}})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should add and replace recursive attributes', ->
    deltaA = new Delta(0, 1, [new InsertOp("a", {outer: {color: 'red'}})])
    deltaB = new Delta(1, 1, [new RetainOp(0, 1, {outer: {color: 'blue', bold: true}})])
    expectedComposed = new Delta(0, 1, [new InsertOp("a", {outer: {color: 'blue', bold: true}})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should remove and add separate recursive attributes', ->
    deltaA = new Delta(0, 1, [new InsertOp("a", {outer: {color: 'red'}})])
    deltaB = new Delta(1, 1, [new RetainOp(0, 1, {outer: {color: null, bold: true}})])
    expectedComposed = new Delta(0, 1, [new InsertOp("a", {outer: {bold: true}})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should overwrite nonrecursive attr val with recursive attr val', ->
    deltaA = new Delta(0, 1, [new InsertOp("a", {outer: 'nonobject'})])
    deltaB = new Delta(1, 1, [new RetainOp(0, 1, {outer: {color: 'red', bold: true}})])
    expectedComposed = new Delta(0, 1, [new InsertOp("a", {outer: {color: 'red', bold: true}})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should overwrite recursive attr val with nonrecursive attr val', ->
    deltaA = new Delta(1, 1, [new RetainOp(0, 1, {outer: {color: 'red', bold: true}})])
    deltaB = new Delta(1, 1, [new InsertOp("a", {outer: 'nonobject'})])
    expectedComposed = new Delta(1, 1, [new InsertOp("a", {outer: 'nonobject'})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should add attribute when all ops are retains', ->
    deltaA = new Delta(1, 1, [new RetainOp(0, 1)])
    deltaB = new Delta(1, 1, [new RetainOp(0, 1, {outer: 'val1'})])
    expectedComposed = deltaB
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should replace attribute when all ops are retains', ->
    deltaA = new Delta(1, 1, [new RetainOp(0, 1, {outer: 'val1'})])
    deltaB = new Delta(1, 1, [new RetainOp(0, 1, {outer: 'val2'})])
    expectedComposed = deltaB
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('should merge attributes when all ops are retains', ->
    deltaA = new Delta(1, 1, [new RetainOp(0, 1, {outer: {inner: 'val1'}})])
    deltaB = new Delta(1, 1, [new RetainOp(0, 1, {outer: {inner2: 'val2'}})])
    expectedComposed = new Delta(1, 1, [new RetainOp(0, 1, {outer: {inner: 'val1', inner2: 'val2'}})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )

  it('it should remove and add attrs when all ops are retains', ->
    deltaA = new Delta(1, 1, [new RetainOp(0, 1, {outer: {inner: 'val1'}})])
    deltaB = new Delta(1, 1, [new RetainOp(0, 1, {outer: {inner: null, inner2: 'val2'}})])
    expectedComposed = new Delta(1, 1, [new RetainOp(0, 1, {outer: {inner: null, inner2: 'val2'}})])
    expectedDecomposed = deltaB
    testComposeAndDecompose(deltaA, deltaB, expectedComposed, expectedDecomposed)
  )
)

##############################
# Test the follows function
##############################
testFollows = (deltaA, deltaB, aIsRemote, expected) ->
  computed = deltaB.follows(deltaA, aIsRemote)
  followsError = "Incorrect follow. Got: " + computed.toString() + ", expected: " + expected.toString()
  assert(computed.isEqual(expected), followsError)

describe('follows', ->
  it('should resolve alternating edits', ->
    deltaA = new Delta(8, 5, [new RetainOp(0, 2), new InsertOp("si"), new RetainOp(7, 8)], 1)
    deltaB = new Delta(8, 5, [new RetainOp(0, 1), new InsertOp("e"), new RetainOp(6, 7), new InsertOp("ow")], 2)
    expected = new Delta(5, 6, [new RetainOp(0, 1), new InsertOp("e"), new RetainOp(2, 4), new InsertOp("ow")], 2)
    testFollows(deltaA, deltaB, false, expected)

    expected = new Delta(5, 6, [new RetainOp(0, 2), new InsertOp("si"), new RetainOp(3, 5)], 1)
    testFollows(deltaB, deltaA, false, expected)
  )

  it('should resolve both clients prepending to the document', ->
    deltaA = new Delta(3, 5, [new InsertOp("aa"), new RetainOp(0, 3)], 1)
    deltaB = new Delta(3, 5, [new InsertOp("bb"), new RetainOp(0, 3)], 2)
    expected = new Delta(5, 7, [new RetainOp(0, 2), new InsertOp("bb"), new RetainOp(2, 5)], 2)
    testFollows(deltaA, deltaB, true, expected)

    expected = new Delta(5, 7, [new InsertOp("aa"), new RetainOp(0, 5)], 1)
    testFollows(deltaB, deltaA, false, expected)
  )

  it('should resolve both clients appending to the document', ->
    deltaA = new Delta(3, 5, [new RetainOp(0, 3), new InsertOp("aa")], 1)
    deltaB = new Delta(3, 5, [new RetainOp(0, 3), new InsertOp("bb")], 2)
    expected = new Delta(5, 7, [new RetainOp(0, 5), new InsertOp("bb")], 2)
    testFollows(deltaA, deltaB, true, expected)

    expected = new Delta(5, 7, [new RetainOp(0, 3), new InsertOp("aa"), new RetainOp(3, 5)], 1)
    testFollows(deltaB, deltaA, false, expected)
  )

  it('should resolve one client prepending, one client appending', ->
    deltaA = new Delta(3, 5, [new InsertOp("aa"), new RetainOp(0, 3)], 1)
    deltaB = new Delta(3, 5, [new RetainOp(0, 3), new InsertOp("bb")], 2)
    expected = new Delta(5, 7, [new RetainOp(0, 5), new InsertOp("bb")], 2)
    testFollows(deltaA, deltaB, false, expected)

    expected = new Delta(5, 7, [new InsertOp("aa"), new RetainOp(0, 5)], 1)
    testFollows(deltaB, deltaA, false, expected)
  )

  it('should resolve one client prepending, one client deleting', ->
    deltaA = new Delta(3, 5, [new InsertOp("aa"), new RetainOp(0, 3)], 1)
    deltaB = new Delta(3, 1, [new RetainOp(0, 1)], 2)
    expected = new Delta(5, 3, [new RetainOp(0, 3)], 2)
    testFollows(deltaA, deltaB, false, expected)

    expected = new Delta(1, 3, [new InsertOp("aa"), new RetainOp(0, 1)], 1)
    testFollows(deltaB, deltaA, false, expected)
  )

  it('should resolve both clients inserting to the middle', ->
    deltaA = new Delta(3, 5, [new RetainOp(0, 2), new InsertOp("aa"), new RetainOp(2, 3)], 2)
    deltaB = new Delta(3, 4, [new RetainOp(0, 2), new InsertOp("b"), new RetainOp(2, 3)], 1)
    expected = new Delta(5, 6, [new RetainOp(0, 2), new InsertOp("b"), new RetainOp(2, 5)], 1)
    testFollows(deltaA, deltaB, false, expected)

    expected = new Delta(4, 6, [new RetainOp(0, 3), new InsertOp("aa"), new RetainOp(3, 4)], 2)
    testFollows(deltaB, deltaA, true, expected)
  )

  it('should resolve both clients deleting from the tail', ->
    deltaA = new Delta(3, 1, [new RetainOp(0, 1)], 1)
    deltaB = new Delta(3, 1, [new RetainOp(0, 1)], 2)
    expected = new Delta(1, 1, [new RetainOp(0, 1)], 3)
    testFollows(deltaA, deltaB, false, expected)
    testFollows(deltaB, deltaA, false, expected)
  )

  it('should resolve both clients deleting different amounts from the tail', ->
    deltaA = new Delta(3, 2, [new RetainOp(0, 2)], 1)
    deltaB = new Delta(3, 0, [], 2)
    expected = new Delta(2, 0, [], 2)
    testFollows(deltaA, deltaB, false, expected)

    expected = new Delta(0, 0, [], 1)
    testFollows(deltaB, deltaA, false, expected)
  )

  it('should resolve one client deleting from the end, one from the beginning', ->
    deltaA = new Delta(3, 1, [new RetainOp(2, 3)], 1)
    deltaB = new Delta(3, 2, [new RetainOp(0, 2)], 2)
    expected = new Delta(1, 0, [], 2)
    testFollows(deltaA, deltaB, false, expected)

    expected = new Delta(2, 0, [], 1)
    testFollows(deltaB, deltaA, false, expected)
  )

  it('should resolve one client deleting from the end, one from the beginning', ->
    deltaA = new Delta(5, 3, [new RetainOp(2, 5)], 1)
    deltaB = new Delta(5, 3, [new RetainOp(0, 3)], 2)
    expected = new Delta(3, 1, [new RetainOp(0, 1)], 2)
    testFollows(deltaA, deltaB, false, expected)
    expected = new Delta(3, 1, [new RetainOp(2, 3)], 1)
    testFollows(deltaB, deltaA, false, expected)
  )

  it('should resolve this fuzzer test we once failed', ->
    deltaA = new Delta(3, 25, [new RetainOp(0, 1), new InsertOp("fpwqyakxrbhdjcxvbepmkm"), new RetainOp(1, 3)], 1)
    deltaB = new Delta(3, 43, [new RetainOp(0, 1), new InsertOp("xqmxjiaykkzheizgdsnjixosvqbqkyorcfwafaqax"), new RetainOp(2, 3)], 2)
    expected = new Delta(25, 65, [new RetainOp(0, 1), new InsertOp("xqmxjiaykkzheizgdsnjixosvqbqkyorcfwafaqax"), new RetainOp(1, 23), new RetainOp(24, 25)], 1)
    testFollows(deltaA, deltaB, false, expected)
    expected = new Delta(43, 65, [new RetainOp(0, 1), new InsertOp("fpwqyakxrbhdjcxvbepmkm"), new RetainOp(1, 43)], 2)
    testFollows(deltaB, deltaA, false, expected)
  )
)

describe('isIdentity', ->
  it('should accept the identity with no attributes', ->
    delta = new Delta(10, 10, [new RetainOp(0, 10)])
    console.assert(delta.isIdentity() == true, "Expected delta #{delta.toString()}
    to be the identity, but delta.isIdentity() says its not")
  )

  it('should accept the identity with an author attribute', ->
    delta = new Delta(10, 10, [new RetainOp(0, 10, {authorId: 'Gandalf'})])
    console.assert(delta.isIdentity() == true, "Expected delta #{delta.toString()}
    to be the identity, but delta.isIdentity() says its not")
  )

  it('should accept the noncompacted identity', ->
    delta = new Delta(10, 10, [new RetainOp(0, 5), new RetainOp(5, 10)])
    console.assert(delta.isIdentity() == true, "Expected delta #{delta.toString()}
    to be the identity, but delta.isIdentity() says its not")
  )

  it('should accept the noncompacted identity with complete author attributes', ->
    delta = new Delta(10, 10, [new RetainOp(0, 5, {authorId: 'Gandalf'}), new
    RetainOp(5, 10, {authorId: 'Frodo'})])
    console.assert(delta.isIdentity() == true, "Expected delta #{delta.toString()}
    to be the identity, but delta.isIdentity() says its not")
  )

  it('should accept the noncompacted identity with partial author attribution', ->
    delta = new Delta(10, 10, [new RetainOp(0, 5), new RetainOp(5, 10, {authorId: 'Frodo'})])
    console.assert(delta.isIdentity() == true,
      "Expected delta #{delta.toString()} to be the identity, but delta.isIdentity() says its not")
  )

  it('should accept the noncompacted identity with partial author attribution', ->
    delta = new Delta(10, 10, [new RetainOp(0, 5, {authorId: 'Frodo'}),
                               new RetainOp(5, 10)])
    console.assert(delta.isIdentity() == true, "Expected delta #{delta.toString()}
    to be the identity, but delta.isIdentity() says its not")
  )

  it('should reject the complete retain of a document if it contains non-author attr', ->
    delta = new Delta(10, 10, [new RetainOp(0, 10, {bold: true})])
    console.assert(delta.isIdentity() == false, "Expected delta #{delta.toString()}
    not to be the identity, but delta.isIdentity() says it is")
  )

  it('should reject the complete retain of a document if it contains non-author attr', ->
    delta = new Delta(10, 10, [new RetainOp(0, 5, {bold: true}),
                               new RetainOp(5, 10, {authorId: 'Frodo'})])
    console.assert(delta.isIdentity() == false, "Expected delta #{delta.toString()}
    to not be the identity, but delta.isIdentity() says it is")
  )

  it('should reject the complete retain of a document if it contains non-author attr', ->
    delta = new Delta(10, 10, [new RetainOp(0, 5, {bold: true}),
                               new RetainOp(5, 10, {bold: null})])
    console.assert(delta.isIdentity() == false, "Expected delta #{delta.toString()}
    to not be the identity, but delta.isIdentity() says it is")
  )

  it('should reject the complete retain of a document if it contains non-author attr', ->
    delta = new Delta(10, 10, [new RetainOp(0, 5), new RetainOp(5, 10, {bold: true})])
    console.assert(delta.isIdentity() == false, "Expected delta #{delta.toString()}
    not to be the identity, but delta.isIdentity() says it is")
  )

  it('should reject the complete retain of a document if it contains non-author attr', ->
    delta = new Delta(10, 10, [new RetainOp(0, 10, {authorId: 'Gandalf', bold: true})])
    console.assert(delta.isIdentity() == false, "Expected delta #{delta.toString()}
    not to be the identity, but delta.isIdentity() says it is")
  )

  it('should reject any delta containing an InsertOp', ->
    delta = new Delta(10, 10, [new RetainOp(0, 4), new InsertOp("a"),
                               new RetainOp(5, 10, {authorId: 'Frodo'})])
    console.assert(delta.isIdentity() == false, "Expected delta #{delta.toString()}
    to not be the identity, but delta.isIdentity() says it is")
  )
)

testApplyDeltaToText = (delta, text, expected) ->
  computed = delta.applyToText(text)
  error = "Incorrect application. Got: " + computed + ", expected: " + expected
  assert.equal(computed, expected, error)

describe('applyDeltaToText', ->
  it('should append a character', ->
    text = "cat"
    delta = new Delta(3, 4, [new RetainOp(0, 3), new InsertOp("s")], 1)
    expected = "cats"
    testApplyDeltaToText(delta, text, expected)
  )

  it('should prepend a character', ->
    text = "cat"
    delta = new Delta(3, 4, [new InsertOp("a"), new RetainOp(0, 3)], 1)
    expected = "acat"
    testApplyDeltaToText(delta, text, expected)
  )

  it('should insert a character into the middle of the document', ->
    text = "cat"
    delta = new Delta(3, 4, [new RetainOp(0, 2), new InsertOp("n"), new RetainOp(2, 3)], 1)
    expected = "cant"
    testApplyDeltaToText(delta, text, expected)
  )

  it('should prepend and append characters', ->
    text = "cat"
    delta = new Delta(3, 7, [new InsertOp("b"), new InsertOp("a"), new InsertOp("t"), new RetainOp(0, 3), new InsertOp("s")], 1)
    expected = "batcats"
    testApplyDeltaToText(delta, text, expected)
  )

  it('should insert every other character', ->
    text = "cat"
    delta = new Delta(3, 6, [new RetainOp(0, 1), new InsertOp("h"), new RetainOp(1, 2), new InsertOp("n"), new RetainOp(2, 3), new InsertOp("s")], 1)
    expected = "chants"
    testApplyDeltaToText(delta, text, expected)
  )

  it('should delete the last character', ->
    text = "cat"
    delta = new Delta(3, 2, [new RetainOp(0, 2)], 1)
    expected = "ca"
    testApplyDeltaToText(delta, text, expected)
  )

  it('should delete the first character', ->
    text = "cat"
    delta = new Delta(3, 2, [new RetainOp(1, 3)], 1)
    expected = "at"
    testApplyDeltaToText(delta, text, expected)
  )

  it('should delete the entire string', ->
    text = "cat"
    delta = new Delta(3, 0, [], 1)
    expected = ""
    testApplyDeltaToText(delta, text, expected)
  )

  it('should delete every other character', ->
    text = "hello"
    delta = new Delta(5, 2, [new RetainOp(1, 2), new RetainOp(3,4)], 1)
    expected = "el"
    testApplyDeltaToText(delta, text, expected)
  )

  it('should insert to beginning, delete from end', ->
    text = "cat"
    delta = new Delta(3, 3, [new InsertOp("a"), new RetainOp(0, 2)], 1)
    expected = "aca"
    testApplyDeltaToText(delta, text, expected)
  )

  it('should replace text with new text', ->
    text = "cat"
    delta = new Delta(3, 3, [new InsertOp("d"), new InsertOp("o"), new InsertOp("g")], 1)
    expected = "dog"
    testApplyDeltaToText(delta, text, expected)
  )

  it('should pass this fuzzer test we once failed', ->
    deltaA = new Delta(3, 17, [new InsertOp("evumzsdinkbgcp"), new RetainOp(0, 3)])
    deltaB = new Delta(3, 33, [new InsertOp("rjieumfrlrukvmmeylxxwtc"), new RetainOp(1, 2), new InsertOp("mklxowze"), new RetainOp(2, 3)])
    deltaBPrime = deltaB.follows(deltaA, true)
    deltaAPrime = deltaA.follows(deltaB, false)
    deltaAFinal = deltaA.compose(deltaBPrime)
    deltaBFinal = deltaB.compose(deltaAPrime)
    xA = deltaAFinal.applyToText("abc")
    xB = deltaBFinal.applyToText("abc")
    if (xA != xB)
      console.info "DeltaA:", deltaA
      console.info "DeltaB:", deltaB
      console.info "deltaAPrime:", deltaAPrime
      console.info "deltaBPrime:", deltaBPrime
      console.info "deltaAFinal:", deltaAFinal
      console.info "deltaBFinal:", deltaBFinal
      assert(false, "Documents diverged. xA is: " + xA + "xB is: " + xB)
    x = xA
  )
)

describe('isInsertsOnly', ->
  it('should accept deltas with a single insert op', ->
    delta = new Delta(0, 3, [new InsertOp("abc")])
    assert(delta.isInsertsOnly())
  )

  it('should reject deltas with a single retain op', ->
    delta = new Delta(0, 3, [new RetainOp(0, 3)])
    assert(!delta.isInsertsOnly())
  )

  it('should reject deltas with multiple retain ops', ->
    delta = new Delta(0, 6, [new RetainOp(1, 4), new RetainOp(6, 9)])
    assert(!delta.isInsertsOnly())
  )

  it('should reject deltas with inserts and retains', ->
    delta = new Delta(0, 6, [new RetainOp(0, 3), new InsertOp("abc")])
    assert(!delta.isInsertsOnly())
  )
)

describe('invert', ->
  testInverse = (deltaA, deltaB) ->
    inverse = deltaA.invert(deltaB)
    assert(((deltaA.compose(deltaB)).compose(inverse)).isEqual(deltaA))

  it('should handle deleting the document', ->
    deltaA = new Delta(0, 1, [new InsertOp("a")])
    deltaB = new Delta(1, 0, [])
    inverse = deltaA.invert(deltaB)
    expectedInverse = new Delta(0, 1, [new InsertOp("a")])
    assert(inverse.isEqual(expectedInverse),
      "Expected: #{expectedInverse} but got: #{inverse}")
  )

  it('should handle deleting the head of the document', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 2, [new RetainOp(1, 3)])
    testInverse(deltaA, deltaB)
  )

  it('should handle deleting the tail of the document', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 1, [new RetainOp(0, 1)])
    expectedInverse = new Delta(1, 3, [new RetainOp(0, 1), new InsertOp("bc")])
    inverse = deltaA.invert(deltaB)
    assert(((deltaA.compose(deltaB)).compose(inverse)).isEqual(deltaA))
  )

  it('should handle deleting the middle of the document', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 2, [new RetainOp(0, 1), new RetainOp(2, 3)])
    testInverse(deltaA, deltaB)
  )

  it('should handle inserting the entire document', ->
    deltaA = new Delta(0, 0, [])
    deltaB = new Delta(0, 3, [new InsertOp("abc")])
    testInverse(deltaA, deltaB)
  )

  it('should handle prepending to the document', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 4, [new InsertOp("1"), new RetainOp(0, 3)])
    testInverse(deltaA, deltaB)
  )

  it('should handle appending to the document', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 4, [new RetainOp(0, 3), new InsertOp("d")])
    testInverse(deltaA, deltaB)
  )

  it('should handle inserting to the middle of the document', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 5, [new RetainOp(0, 1),
                              new InsertOp("12"),
                              new RetainOp(1, 3)])
    testInverse(deltaA, deltaB)
  )

  it('should handle replacing the entire document', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 3, [new InsertOp("123")])
    testInverse(deltaA, deltaB)
  )

  it('should handle replacing the head of the document', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 3, [new InsertOp("1"), new RetainOp(1, 3)])
    testInverse(deltaA, deltaB)
  )

  it('should handle replacing the tail of the document', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 3, [new RetainOp(0, 2), new InsertOp("1")])
    testInverse(deltaA, deltaB)
  )

  it('should handle replacing the middle of the document', ->
    deltaA = new Delta(0, 3, [new InsertOp("abc")])
    deltaB = new Delta(3, 3, [new RetainOp(0, 1),
                              new InsertOp("1"),
                              new RetainOp(2, 3)])
    testInverse(deltaA, deltaB)
  )
)

##############################
# Fuzzer to test compose, follows, and applyDeltaToText.
# This test simulates two clients each making 10000 deltas on the document.
# On each iteration, each client applies their own delta, and the others
# delta, to their document. After doing so, we assert that the document is in
# the same state.
# Deltas are randomly generated. Each delta has somewhere between 0 and 10
# changes, and each change has a 50/50 chance of being a delete or insert. If it
# is an insert, then there will be a random number between 0 and 20 random
# characters inserted at a random index. If it is a delete, a random index will
# be deleted.
##############################
getRandInt = (min, max) ->
  return Math.floor(Math.random() * (max - min + 1)) + min

attributes = ["bold", "italics", "fontsize"]

getRandStr = (numInsertions) ->
  console.assert(numInsertions > 0, "Must create insertion of at least 1 char")
  alphabet = "abcdefghijklmnopqrstuvwxyz"
  str = ""
  for i in [0..numInsertions - 1]
    str += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  return str

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

deleteAt = (delta, deletionPoint, numToDelete) ->
  charIndex = 0
  ops = []
  for elem in delta.ops
    if numToDelete > 0 && (charIndex == deletionPoint or deletionPoint < charIndex + elem.getLength())
      curDelete = Math.min(numToDelete, elem.getLength() - (deletionPoint - charIndex))
      numToDelete -= curDelete
      if Delta.isInsert(elem)
        newText = elem.value.substring(0, deletionPoint - charIndex) + elem.value.substring(deletionPoint - charIndex + curDelete)
        ops.push(new InsertOp(newText)) if newText.length > 0
      else
        console.assert(Delta.isRetain(elem), "Expected retain but got: #{elem}")
        head = new RetainOp(elem.start, elem.start + deletionPoint - charIndex, _.clone(elem.attributes))
        tail = new RetainOp(elem.start + deletionPoint - charIndex + curDelete, elem.end, _.clone(elem.attributes))
        ops.push(head) if head.start < head.end
        ops.push(tail) if tail.start < tail.end
      deletionPoint += curDelete
    else
      ops.push(elem)
    charIndex += elem.getLength()
  delta.ops = ops
  delta.endLength = _.reduce(ops, (length, delta) ->
    return length + delta.getLength()
  , 0)

formatAt = (delta, formatPoint, numToFormat, attrs, reference) ->
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

addRandomChange = (delta, docDelta) ->
  chance = Math.random()
  if (chance < 0.3)
    insertionPoint = getRandInt(0, delta.endLength - 1)
    numInsertions = getRandInt(1, 20)
    insertions = getRandStr(numInsertions)
    insertAt(delta, insertionPoint, insertions)
  else if (chance >= 0.3 and chance < 0.6)
    indexToDelete = getRandInt(0, delta.endLength - 1)
    numToDelete = getRandInt(0, delta.endLength - indexToDelete - 1)
    deleteAt(delta, indexToDelete, numToDelete)
  else
    indexToFormat = getRandInt(0, delta.endLength - 1)
    numToFormat = getRandInt(0, delta.endLength - indexToFormat - 1)
    # Pick a random number of random attributes
    attributes.sort(-> return 0.5 - Math.random())
    numAttrs = getRandInt(0, attributes.length)
    attrs = attributes.slice(0, numAttrs)
    formatAt(delta, indexToFormat, 1, attrs, docDelta)
  return delta

# Returns a randomly generated delta based on the input delta (representing the
# current state of the document)
createDelta = (doc, docDelta) ->
  # Start with the identity
  if doc.length == 0
    delta = new Delta(doc.length, doc.length, [], 1)
  else
    delta = new Delta(doc.length, doc.length, [new RetainOp(0, doc.length)], 1)
  numChanges = Math.floor(Math.random() * 11)
  for i in [0...numChanges]
    addRandomChange(delta, docDelta)
  return delta

########################################
# Test fuzzer helpers before fuzzing
########################################
delta = new Delta(0, 6, [new RetainOp(0, 6)])
deleteAt(delta, 3, 1)
assert(delta.isEqual(new Delta(0, 5, [new RetainOp(0, 3), new RetainOp(4, 6)])))

delta = new Delta(0, 6, [new RetainOp(0, 6)])
deleteAt(delta, 3, 2)
assert(delta.isEqual(new Delta(0, 4, [new RetainOp(0, 3), new RetainOp(5, 6)])))

delta = new Delta(0, 6, [new RetainOp(0, 6)])
deleteAt(delta, 5, 1)
assert(delta.isEqual(new Delta(0, 5, [new RetainOp(0, 5)])))

delta = new Delta(0, 6, [new RetainOp(0, 6)])
deleteAt(delta, 5, 2)
assert(delta.isEqual(new Delta(0, 5, [new RetainOp(0, 5)])))

delta = new Delta(0, 6, [new RetainOp(0, 6)])
deleteAt(delta, 0, 1)
assert(delta.isEqual(new Delta(0, 5, [new RetainOp(1, 6)])))

delta = new Delta(0, 6, [new RetainOp(0, 6)])
deleteAt(delta, 0, 6)
assert(delta.isEqual(new Delta(0, 0, [])))

delta = new Delta(0, 6, [new InsertOp("012345")])
deleteAt(delta, 0, 1)
assert(delta.isEqual(new Delta(0, 5, [new InsertOp("12345")])))

delta = new Delta(0, 6, [new InsertOp("012345")])
deleteAt(delta, 0, 4)
assert(delta.isEqual(new Delta(0, 2, [new InsertOp("45")])))

delta = new Delta(0, 6, [new InsertOp("012345")])
deleteAt(delta, 3, 1)
assert(delta.isEqual(new Delta(0, 5, [new InsertOp("01245")])))

delta = new Delta(0, 6, [new InsertOp("012345")])
deleteAt(delta, 3, 3)
assert(delta.isEqual(new Delta(0, 3, [new InsertOp("012")])))

delta = new Delta(0, 6, [new InsertOp("012345")])
deleteAt(delta, 3, 1)
assert(delta.isEqual(new Delta(0, 5, [new InsertOp("01245")])))

delta = new Delta(0, 6, [new InsertOp("012345")])
deleteAt(delta, 5, 1)
assert(delta.isEqual(new Delta(0, 5, [new InsertOp("01234")])))

delta = new Delta(0, 6, [new RetainOp(0, 3), new InsertOp("abc")])
deleteAt(delta, 2, 3)
assert(delta.isEqual(new Delta(0, 3, [new RetainOp(0, 2), new InsertOp("c")])))

delta = new Delta(0, 6, [new RetainOp(0, 3), new RetainOp(6, 9)])
deleteAt(delta, 2, 3)
assert(delta.isEqual(new Delta(0, 3, [new RetainOp(0, 2), new RetainOp(8, 9)])))

delta = new Delta(0, 6, [new RetainOp(0, 3), new RetainOp(6, 9)])
deleteAt(delta, 0, 3)
assert(delta.isEqual(new Delta(0, 3, [new RetainOp(6, 9)])))

delta = new Delta(0, 6, [new InsertOp("abc"), new InsertOp("efg")])
deleteAt(delta, 2, 3)
assert(delta.isEqual(new Delta(0, 3, [new InsertOp("ab"), new InsertOp("g")])))

delta = new Delta(0, 6, [new InsertOp("abc"), new RetainOp(3, 6)])
deleteAt(delta, 2, 3)
assert(delta.isEqual(new Delta(0, 3, [new InsertOp("ab"), new RetainOp(5, 6)])))

delta = new Delta(37, 28, [new RetainOp(0, 21), new RetainOp(24, 26), new RetainOp(32, 37)])
deleteAt(delta, 12, 14)
assert(delta.isEqual(new Delta(37, 14, [new RetainOp(0, 12), new RetainOp(35, 37)])))

delta = new Delta(0, 6, [new InsertOp("012345")])
insertAt(delta, 3, "abcdefg")
assert(delta.isEqual(new Delta(0, 13, [new InsertOp("012abcdefg345")])))

delta = new Delta(0, 6, [new InsertOp("012345")])
insertAt(delta, 0, "abcdefg")
assert(delta.isEqual(new Delta(0, 13, [new InsertOp("abcdefg012345")])))

delta = new Delta(0, 6, [new InsertOp("012345")])
insertAt(delta, 6, "abcdefg")
assert(delta.isEqual(new Delta(0, 13, [new InsertOp("012345abcdefg")])))


reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 0, 1, ["bold"], reference)
expected = new Delta(3, 6, [new InsertOp("a"), new InsertOp("bc", {bold: true}), new RetainOp(0, 3)])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 0, 1, ["bold", "italics"], reference)
expected = new Delta(3, 6, [new InsertOp("a", {italics: true}), new InsertOp("bc", {bold: true}), new RetainOp(0, 3)])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 0, 2, ["bold"], reference)
expected = new Delta(3, 6, [new InsertOp("ab"), new InsertOp("c", {bold: true}), new RetainOp(0, 3)])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 0, 2, ["bold", "italics"], reference)
expected = new Delta(3, 6, [new InsertOp("ab", {italics: true}), new InsertOp("c", {bold: true}), new RetainOp(0, 3)])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 1, 2, ["bold"], reference)
expected = new Delta(3, 6, [new InsertOp("a", {bold: true}), new InsertOp("bc"), new RetainOp(0, 3)])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 1, 2, ["bold", "italics"], reference)
expected = new Delta(3, 6, [new InsertOp("a", {bold: true}), new InsertOp("bc", {italics: true}), new RetainOp(0, 3)])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 2, 1, ["bold"], reference)
expected = new Delta(3, 6, [new InsertOp("ab", {bold: true}), new InsertOp("c"), new RetainOp(0, 3)])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 2, 1, ["bold", "italics"], reference)
expected = new Delta(3, 6, [new InsertOp("ab", {bold: true}), new InsertOp("c", {italics: true}), new RetainOp(0, 3)])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 0, 3, ["italics"], reference)
expected = new Delta(3, 6, [new InsertOp("abc", {bold: true, italics: true}), new RetainOp(0, 3)])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 2, 1, ["italics"], reference)
expected = new Delta(3, 6, [new InsertOp("ab", {bold: true}), new InsertOp("c", {bold: true, italics: true}), new RetainOp(0, 3)])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 3, [new RetainOp(0, 3)])
formatAt(delta, 1, 1, ["bold"], reference)
expected = new Delta(3, 3, [new RetainOp(0, 1), new RetainOp(1, 2, {bold: null}), new RetainOp(2, 3)])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 3, [new RetainOp(0, 3)])
formatAt(delta, 1, 1, ["bold", "italics"], reference)
expected = new Delta(3, 3, [new RetainOp(0, 1), new RetainOp(1, 2, {bold: null, italics: true}), new RetainOp(2, 3)])
assert(delta.isEqual(expected, "Expected #{expected} but got #{delta}"))

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 3, [new RetainOp(0, 3)])
formatAt(delta, 0, 3, ["bold"], reference)
expected = new Delta(3, 3, [new RetainOp(0, 3, {bold: null})])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 3, 3, ["bold"], reference)
expected = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3, {bold: null})])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 3, 3, ["bold", "italics"], reference)
expected = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3, {bold: null, italics: true})])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")

reference = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
delta = new Delta(3, 6, [new InsertOp("abc", {bold: true}), new RetainOp(0, 3)])
formatAt(delta, 0, 3, ["bold"], reference)
expected = new Delta(3, 6, [new InsertOp("abc"), new RetainOp(0, 3)])
assert(delta.isEqual(expected), "Expected #{expected} but got #{delta}")


describe('Fuzzers', ->
  ##############################
  # Fuzz lots of changes being made to the doc (compose, follows, applyDeltaToText
  # all get fuzzed here)
  ##############################
  it('should pass all standard fuzzing', ->
    # x represents the consistent state of the document with deltas applied.
    x = "cat"
    xDelta = new Delta(0, 3, [new InsertOp("cat", {bold: true})])
    pass = _.all([1..1000], (i) ->
      deltaA = createDelta(x, xDelta)
      deltaB = createDelta(x, xDelta)
      # 50/50 as to which client gets priority
      isRemote = if Math.random() > 0.5 then true else false
      deltaBPrime = deltaB.follows(deltaA, isRemote)
      deltaAPrime = deltaA.follows(deltaB, !isRemote)
      deltaAFinal = deltaA.compose(deltaBPrime)
      deltaBFinal = deltaB.compose(deltaAPrime)
      xA = deltaAFinal.applyToText(x)
      xB = deltaBFinal.applyToText(x)
      # After each client applies their own change, and the other client's
      # transformed change (follow), the documents should be consistent
      x = xA
      xDelta = xDelta.compose(deltaAFinal)
      return xA == xB
    )
    assert(pass == true)
  )

  ##############################
  # Fuzz decompose
  ##############################
  it('should pass all decompse fuzzing', ->
    pass = _.all([1..1000], (i) ->
      numInsertions = getRandInt(1, 40)
      insertions = getRandStr(numInsertions)
      deltaA = new Delta(0, insertions.length, [new InsertOp(insertions)])
      for j in [0...10]
        indexToFormat = getRandInt(0, deltaA.endLength - 1)
        numToFormat = getRandInt(0, deltaA.endLength - indexToFormat - 1)
        # Pick a random number of random attributes
        attributes.sort(-> return 0.5 - Math.random())
        numAttrs = Math.floor(Math.random() * (attributes.length + 1))
        attrs = attributes.slice(0, numAttrs)
        numToFormat = Math.floor(Math.random() * (deltaA.endLength - indexToFormat))
        formatAt(deltaA, indexToFormat, numToFormat, attrs, new Delta(0, 0, []))

      deltaC = Delta.copy(deltaA)
      numChanges = Math.floor(Math.random() * 11)
      for j in [0...numChanges]
        addRandomChange(deltaC, deltaA)
      deltaC.compact()
      decomposed = deltaC.decompose(deltaA)
      composed = deltaA.compose(decomposed)
      return deltaC.isEqual(composed)
    )
    assert(pass == true)
  )
)

