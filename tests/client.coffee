url = require('url')
Tandem = require('../browser')

Tandem.Network.Socket.parseUrl = (inputUrl) ->
  return url.parse(inputUrl)

module.exports = Tandem
