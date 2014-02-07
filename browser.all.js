Tandem = require('./browser')
TandemSocket = require('./src/client/network/socket')

Tandem.Client.DEFAULTS.network = TandemSocket

module.exports = Tandem
