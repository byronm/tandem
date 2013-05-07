Authentication
===

Custom authentication is supported via storage's authorize function (see storage.md for more info):

```javascript
authorize = function(authPacket, callback) {
  callback(null) // success
  callback('Access denied') // or any other message, object or any defined valued for failure
                            // this will be passed back to the client
}
```

The contents of authPacket are as follows:
```javascript
authPacket = {
  fileId: 'abc123',
  userId: 'user-123',   // Defined if userId is specified via the client
  auth: {}              // Custom data from the client to assist in auth
}
```

The two optional fields userId and auth are specified when you initialize the client:

```javascript
var client = new Tandem.Client('127.0.0.1:8080', userId, auth);
```


## Examples

Since the auth value is specified on the client side and verifiable by whatever means on the server, a number of authentication schemes are possible.

### Encryption

Encrypt `{ userId: 'user', random: 'noise' }` and pass it into `auth`. On the server side, decrypt the object and verify the `authPacket.userId` matched the decrypted `userId` and that that user has access to `authPacket.fileId`.
