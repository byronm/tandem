Delta
===

Deltas are passed between the Tandem server and clients for file updates. It is composed of:

    delta = {
      startLength: 0      # Length of file before applying ops
      endLength: 0        # Length of file after applying ops
      ops: []             # Array of operations to be applied
    }


Operations
---

Tandem recognized two types of operations: insertions and retains. The absence of a retain implies a deletion. Thus all deltas describe an entire document, not just portions of it.


Attributes
---

All inserts and retains can optionally have an 'attributes' field. It is used to add additional information such as formatting for text operations.


Text Operations
---

### Insert

    insertOp = {
      index: 1
      text: 'Hello'
      attributes: {
        bold: true
      }
    }

### Retain

    retainOp = {
      start: 1
      end: 3
    }
