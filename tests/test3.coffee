jetsync    = require('../lib/jetsync')
_          = require('underscore')._
JetDelta   = jetsync.JetDelta
JetInsert  = jetsync.JetInsert
JetRetain  = jetsync.JetRetain
JetSync    = jetsync.JetSync

# Simpler case of the second test
deltaA = new JetDelta(0, 11, [new JetInsert("bold", {bold: true}), new JetInsert("italics", {italics: true})])
deltaB = new JetDelta(0, 7, [new JetInsert("italics", {italics: true})])
decomposed = JetSync.decompose(deltaA, deltaB)
composed = JetSync.compose(deltaA, decomposed)
console.assert(_.isEqual(deltaB, composed))

deltaA = {
  "startLength":0,
  "endLength":28,
  "deltas":[
    {
      "text":"Bold",
      "attributes":{
        "bold":true
      },
      "length":4
    },
    {
      "text":"Italic",
      "attributes":{
        "italic":true
      },
      "length":6
    },
    {
      "text":"\n",
      "attributes":{

      },
      "length":1
    },
    {
      "text":"a",
      "attributes":{
        "bold":true
      },
      "length":1
    },
    {
      "text":"b",
      "attributes":{
        "italic":true
      },
      "length":1
    },
    {
      "text":"c",
      "attributes":{
        "strike":true
      },
      "length":1
    },
    {
      "text":"d",
      "attributes":{
        "underline":true
      },
      "length":1
    },
    {
      "text":"\n",
      "attributes":{

      },
      "length":1
    },
    {
      "text":"Bold2",
      "attributes":{
        "bold":true
      },
      "length":5
    },
    {
      "text":"Italic2",
      "attributes":{
        "italic":true
      },
      "length":7
    }
  ]
}
deltaB = {
  "startLength":0,
  "endLength":24,
  "deltas":[
    {
      "text":"Italic",
      "attributes":{
        "italic":true
      },
      "length":6
    },
    {
      "text":"\n",
      "attributes":{

      },
      "length":1
    },
    {
      "text":"a",
      "attributes":{
        "bold":true
      },
      "length":1
    },
    {
      "text":"b",
      "attributes":{
        "italic":true
      },
      "length":1
    },
    {
      "text":"c",
      "attributes":{
        "strike":true
      },
      "length":1
    },
    {
      "text":"d",
      "attributes":{
        "underline":true
      },
      "length":1
    },
    {
      "text":"\n",
      "attributes":{

      },
      "length":1
    },
    {
      "text":"Bold2",
      "attributes":{
        "bold":true
      },
      "length":5
    },
    {
      "text":"Italic2",
      "attributes":{
        "italic":true
      },
      "length":7
    }
  ]
}

deltaA = JetDelta.makeDelta(deltaA)
deltaB = JetDelta.makeDelta(deltaB)
decomposed = JetSync.decompose(deltaA, deltaB)
composed = JetSync.compose(deltaA, decomposed)
console.assert(_.isEqual(deltaB, composed))

# TODO: Move these into compose_decompose unit test file when I reorganize all the tests
deltaA = new JetDelta(0, 4, [new JetInsert("ab"), new JetInsert("c", {bold: true}), new JetInsert("\n")])
deltaC = new JetDelta(0, 3, [new JetInsert("ab\n")])
decomposed = JetSync.decompose(deltaA, deltaC)
composed = JetSync.compose(deltaA, decomposed)
console.assert(_.isEqual(deltaC, composed))

deltaA = new JetDelta(0, 7, [new JetInsert("ab"), new JetInsert("c", {bold: true}), new JetInsert("\ndef")])
deltaC = new JetDelta(0, 6, [new JetInsert("ab\ndef")])
decomposed = JetSync.decompose(deltaA, deltaC)
composed = JetSync.compose(deltaA, decomposed)
console.assert(_.isEqual(deltaC, composed))
