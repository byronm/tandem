url = require('url')

if process.env.TANDEM_COV?
  Tandem = require('../build/tandem.all.js')
else
  Tandem = require('../browser')

Tandem.Network.Socket.parseUrl = (inputUrl) ->
  return url.parse(inputUrl)

module.exports = Tandem
