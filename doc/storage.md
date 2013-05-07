Storage
===

By default there is no persistent storage. However it can be added by defining a simple storage object with the following interface:

```javascript
Storage = {
  // See authentication for more info on the format of authPacket
  authorize: function (authPacket, callback) {
    callback(err, hasAccess);
  }

  find: function (fileId, callback) {
    callback(err, head, version);
  }

  update: function (fileId, head, version, callback) {
    callback(err);
  }
}
```

This custom storage object can be passed into the options object when initializing Tandem.Server

```javascript
var server = new Tandem.Server(httpServer, { storage: Storage });
```

A simple implementation can be found in the storage unit test in tests/storage.coffee
