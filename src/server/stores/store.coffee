class TandemStore
  constructor: ->

  get: (key, callback) ->
    console.warn "Should be overwritten by descendant"

  set: (key, value, callback) ->
    console.warn "Should be overwritten by descendant"

  push: (key, value, callback) ->
    console.warn "Should be overwritten by descendant"
    

module.export = TandemStore
