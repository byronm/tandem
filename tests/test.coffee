jetsync    = require('../lib/jetsync')
_          = require('underscore')._
JetDelta   = jetsync.JetDelta
JetInsert  = jetsync.JetInsert
JetRetain  = jetsync.JetRetain
JetSync    = jetsync.JetSync

deltaA = new JetDelta(0, 7, [new JetInsert("abc\ndef")])
deltaB = new JetDelta(0, 8, [new JetInsert("a\nbc\ndef")])

decomposed = JetSync.decompose(deltaA, deltaB)
composed = JetSync.compose(deltaA, decomposed)
console.assert(_.isEqual(deltaB, composed))

# Fuzzer tests we failed at one point in time
deltaA = new JetDelta(3, 7, [new JetInsert("anc"), new JetRetain(0, 2), new JetInsert("x"), new JetRetain(2, 3)])
deltaC = new JetDelta(3, 9, [new JetInsert("nfooancx"), new JetRetain(2, 3)])
decomposed = JetSync.decompose(deltaA, deltaC)
composed = JetSync.compose(deltaA, decomposed)
console.assert(_.isEqual(deltaC, composed))

deltaA = new JetDelta(3, 13, [new JetInsert("yornzer"), new JetRetain(0, 2), new JetInsert("xyz"), new JetRetain(2, 3)])
deltaC = new JetDelta(3, 22, [new JetInsert("nfooyornzeyornzerrxyz"), new JetRetain(2, 3)])
decomposed = JetSync.decompose(deltaA, deltaC)
composed = JetSync.compose(deltaA, decomposed)
console.assert(_.isEqual(deltaC, composed))
