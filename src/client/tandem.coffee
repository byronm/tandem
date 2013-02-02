TandemDelta     = require('../core/delta')
TandemOp        = require('../core/op')
TandemInsertOp  = require('../core/insert')
TandemRetainOp  = require('../core/retain')

TandemEngine    = require('./engine')
TandemFile      = require('./file')
TandemNetwork   = require('./network')


class TandemClient
  constructor: (@endpointUrl, @user, @settings = {}) ->

  open: (fileId, authObj, initial, version = 0) ->
    @adapter = new TandemNetwork(@endpointUrl, fileId, @user, authObj, @settings)
    return new TandemFile(fileId, @adapter, initial, version)


window.Tandem =
  Delta     : TandemDelta
  Op        : TandemOp
  InsertOp  : TandemInsertOp
  RetainOp  : TandemRetainOp

  Client    : TandemClient
  Engine    : TandemEngine
  File      : TandemFile
  Network   : TandemNetwork
