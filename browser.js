Tandem = require('./browser.bare')
TandemSocket = require('./build/client/network/socket')

Tandem.Network.Socket = TandemSocket
Tandem.Client.DEFAULTS.network = TandemSocket

module.exports = Tandem
