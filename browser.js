Tandem = require('./browser.bare')
TandemSocket = require('./src/client/network/socket')

Tandem.Network.Socket = TandemSocket
Tandem.Client.DEFAULTS.network = TandemSocket

module.exports = Tandem
