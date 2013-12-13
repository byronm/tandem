GLOBAL._ = require('underscore')._
GLOBAL.EventEmitter2 = require('events').EventEmitter
GLOBAL.async = require('async')
GLOBAL.io = require('socket.io-client')

url = require('url')

Tandem = require('tandem-core')
base = if process.env.TANDEM_COV? then './build' else './src'
Tandem.Client = require("#{base}/client/tandem")
Tandem.Engine = require("#{base}/client/engine")
Tandem.File   = require("#{base}/client/file")
Tandem.NetworkAdapter = require("#{base}/client/network")
Tandem.NetworkAdapter.parseUrl = (inputUrl) ->
  return url.parse(inputUrl)

module.exports = Tandem
