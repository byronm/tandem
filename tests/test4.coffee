jetsync    = require('../lib/jetsync')
_          = require('underscore')._
JetDelta   = jetsync.JetDelta
JetInsert  = jetsync.JetInsert
JetRetain  = jetsync.JetRetain
JetSync    = jetsync.JetSync

deltaA = {
  "startLength":0,
  "endLength":39,
  "deltas":[{
    "text":"Plan Details", "attributes":{"bold":true}
  }, {
    "text":"\n\nLorem ipsum dolor sit am\n","attributes":{}
  }]
}
deltaB = {
  "startLength":0,
  "endLength":40,
  "deltas":[{
    "text":"Plan ","attributes":{"bold":true}
  }, {
    "text":"\n","attributes":{}
  }, {
    "text":"Details","attributes":{"bold":true}
  }, {
    "text":"\n\nLorem ipsum dolor sit am\n","attributes":{}
  }]
}
deltaA = JetDelta.makeDelta(deltaA)
deltaB = JetDelta.makeDelta(deltaB)
decomposed = JetSync.decompose(deltaA, deltaB)

console.log decomposed.deltas.length
console.log decomposed

# Same non-optimal behavior but in a more concise test.
deltaA = new JetDelta(0, 3, [new JetInsert("ab", {bold: true}),
                             new JetInsert("c")])
deltaB = new JetDelta(0, 4, [new JetInsert("a", {bold: true}),
                             new JetInsert("c"),
                             new JetInsert("b", {bold: true})
                             new JetInsert("c")])

decomposed = JetSync.decompose(deltaA, deltaB)

console.log decomposed.deltas.length
console.log decomposed
