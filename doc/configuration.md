Configuration
===


Server
---

The tandem server can be configured via the second parameter:

    server = new Tandem.Server(server, {'save interval': 1000})

The following configurations are supported:

- 'save interval' - interval in milliseconds at which dirty documents are saved to the back end

In addition, the following socket.io configurations are valid. See [Configuring Socket.io](https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO) for more details.

- 'log level'
- 'transports'


Client
---

The tandem client can be configured via the third parameter:

    client = new Tandem.Client('http://localhost', user, {'port': 443})

The following socket.io configurations are valid. See [Configuring Socket.io](https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO) for more details.

- 'force new connection'
- 'max reconnection attempts'
- 'port'
- 'reconnection limit'
- 'sync disconnect on unload'
