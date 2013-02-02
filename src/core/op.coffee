_ = require('underscore')._ if module?


class Op
  constructor: (attributes = {}) ->
    @attributes = _.clone(attributes)

  addAttributes: (attributes) ->
    addedAttributes = {}
    for key, value of attributes when @attributes[key] == undefined
      addedAttributes[key] = value
    return addedAttributes

  attributesMatch: (other) ->
    otherAttributes = other.attributes || {}
    return _.isEqual(@attributes, otherAttributes)

  composeAttributes: (attributes) ->
    that = this
    resolveAttributes = (oldAttrs, newAttrs) ->
      return oldAttrs if !newAttrs
      resolvedAttrs = _.clone(oldAttrs)
      for key, value of newAttrs
        if value == null
          delete resolvedAttrs[key]
        else if typeof value != 'undefined'
          if typeof resolvedAttrs[key] == 'object' and typeof value == 'object' and _.all([resolvedAttrs[key], newAttrs[key]], ((val) -> val != null))
            resolvedAttrs[key] = resolveAttributes(resolvedAttrs[key], value)
          else
            resolvedAttrs[key] = value
      return resolvedAttrs
    return resolveAttributes(@attributes, attributes)

  numAttributes: () ->
    _.keys(@attributes).length

  toString: ->
    printAttrs = (attrs) ->
      attr_str = ""
      for key, value of @attributes
        attr_str += key + ":"
        if typeof value == 'object' and value != null
          attr_str += "{" + printAttrs(value) + "},"
        else
          attr_str += value + ","
      return "{" + attr_str + "}"
    return printAttrs(@attributes)


module.exports = Op
