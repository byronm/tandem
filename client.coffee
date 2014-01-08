GLOBAL._ = require('underscore')._
GLOBAL.EventEmitter2 = require('events').EventEmitter
GLOBAL.async = require('async')
GLOBAL.io = require('socket.io-client')

url = require('url')

Tandem = require('tandem-core')
base = if process.env.TANDEM_COV? then './build' else './src'
Tandem.Client = require("#{base}/client/tandem")
Tandem.File   = require("#{base}/client/file")
Tandem.Network = 
  Adapter : require("#{base}/client/network/adapter")
  Socket  : require("#{base}/client/network/socket")
Tandem.Network.Socket.parseUrl = (inputUrl) ->
  return url.parse(inputUrl)

module.exports = Tandem
