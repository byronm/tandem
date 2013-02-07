TandemDelta     = require('../core/delta')
TandemOp        = require('../core/op')
TandemInsertOp  = require('../core/insert')
TandemRetainOp  = require('../core/retain')

unless window.Tandem?
  window.Tandem =
    Delta     : TandemDelta
    Op        : TandemOp
    InsertOp  : TandemInsertOp
    RetainOp  : TandemRetainOp
