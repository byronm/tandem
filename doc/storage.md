Storage
===

By default there is no persistent storage. However it can be added by defining a simple storage object with the following interface:

```javascript
Storage = {
  // authObj is an object the that at minimum has fileId defined
  // If userId is defined, it will be the identifier for a user entity and will be added
  //   to messages where it makes sense to have a user or author, ex. broadcast messages.
  //   Two connections with the same userId will be treated as separate sessions.
  // All other fields are optional and can contain whatever else necessary for authentication
  authorize: function (authObj, callback) {
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
