jetsync    = require('../lib/jetsync')
_          = require('underscore')._
JetDelta   = jetsync.JetDelta
JetInsert  = jetsync.JetInsert
JetRetain  = jetsync.JetRetain
JetSync    = jetsync.JetSync

deltaA = new JetDelta(10, 10, [new JetRetain(0, 10)])
deltaB = new JetDelta(10, 10, [new JetRetain(0,3), new JetRetain(3,6,{bold:true}), new JetRetain(6,10)])
composed = JetSync.compose(deltaA, deltaB)
console.log composed
console.assert(_.isEqual(deltaB, composed))

deltaA = new JetDelta(10, 10, [new JetRetain(0, 10)])
deltaB = new JetDelta(10, 10, [new JetRetain(0,3, {italic: true}), new JetRetain(3,6,{bold:true}), new JetRetain(6,10)])
composed = JetSync.compose(deltaA, deltaB)
console.log composed
console.assert(_.isEqual(deltaB, composed))

delta = new JetDelta(10, 10, [new JetRetain(0, 10)])
console.assert(delta.isIdentity() == true, "Expected delta #{delta.toString()}
to be the identity, but delta.isIdentity() says its not")

delta = new JetDelta(10, 10, [new JetRetain(0, 10, {authorId: 'Gandalf'})])
console.assert(delta.isIdentity() == true, "Expected delta #{delta.toString()}
to be the identity, but delta.isIdentity() says its not")

delta = new JetDelta(10, 10, [new JetRetain(0, 5, {authorId: 'Gandalf'}), new
JetRetain(5, 10, {authorId: 'Frodo'})])
console.assert(delta.isIdentity() == true, "Expected delta #{delta.toString()}
to be the identity, but delta.isIdentity() says its not")

delta = new JetDelta(10, 10, [new JetRetain(0, 5), new
JetRetain(5, 10)])
console.assert(delta.isIdentity() == true, "Expected delta #{delta.toString()}
to be the identity, but delta.isIdentity() says its not")

delta = new JetDelta(10, 10, [new JetRetain(0, 5), new
JetRetain(5, 10, {authorId: 'Frodo'})])
console.assert(delta.isIdentity() == true, "Expected delta #{delta.toString()}
to be the identity, but delta.isIdentity() says its not")

delta = new JetDelta(10, 10, [new JetRetain(0, 5, {authorId: 'Frodo'}), new
JetRetain(5, 10)])
console.assert(delta.isIdentity() == true, "Expected delta #{delta.toString()}
to be the identity, but delta.isIdentity() says its not")

delta = new JetDelta(10, 10, [new JetRetain(0, 5, {bold: true}), new
JetRetain(5, 10, {authorId: 'Frodo'})])
console.assert(delta.isIdentity() == false, "Expected delta #{delta.toString()}
to not be the identity, but delta.isIdentity() says it is")

delta = new JetDelta(10, 10, [new JetRetain(0, 5, {bold: true}), new
JetRetain(5, 10, {bold: null})])
console.assert(delta.isIdentity() == false, "Expected delta #{delta.toString()}
to not be the identity, but delta.isIdentity() says it is")

delta = new JetDelta(10, 10, [new JetRetain(0, 4), new JetInsert("a"), new
JetRetain(5, 10, {authorId: 'Frodo'})])
console.assert(delta.isIdentity() == false, "Expected delta #{delta.toString()}
to not be the identity, but delta.isIdentity() says it is")

delta = new JetDelta(10, 10, [new JetRetain(0, 10, {bold: true})])
console.assert(delta.isIdentity() == false, "Expected delta #{delta.toString()}
not to be the identity, but delta.isIdentity() says it is")

delta = new JetDelta(10, 10, [new JetRetain(0, 5), new JetRetain(5, 10, {bold: true})])
console.assert(delta.isIdentity() == false, "Expected delta #{delta.toString()}
not to be the identity, but delta.isIdentity() says it is")

delta = new JetDelta(10, 10, [new JetRetain(0, 10, {authorId: 'Gandalf', bold: true})])
console.assert(delta.isIdentity() == false, "Expected delta #{delta.toString()}
not to be the identity, but delta.isIdentity() says it is")

