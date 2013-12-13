WARNING
===

Please do not publicize this repository in any way. There are a few known documentation gaps and other issues we wish to address before publication. Thank you for your patience.

Tandem Realtime Coauthoring Engine
===

This repository is also both a Rails gem and a Node.js module.

[![Build Status](https://secure.travis-ci.org/stypi/tandem.png?branch=master)](http://travis-ci.org/stypi/tandem)

How to Use
---

### Client

```javascript
var tandem = new Tandem.Client('https://node.stypi.com');
var file = tandem.open(fileId);
file.on('file-update', function(delta) {
    // ...
});
file.update(delta);
```

### Server

```javascript
var Tandem = require('tandem')

var server = require('http').Server();
new Tandem.Server(server);
```


Installation
---
    
### NPM (Server)

Add to package.json

    "dependencies"  : {
        "tandem": "git+ssh://git@github.com:stypi/tandem.git#v0.3.2"
    }

### Rails Bundler (Client)

Popular javascript libraries are offically included as dependencies. Less popular libraries will be concatenated with source as part of the build process. To install, just add to Gemfile:

    gem 'tandem-rails', :git => 'git@github.com:stypi/tandem.git', :branch => 'v0.3.2'


Testing
---

We use mocha as our testing framework. To run the unit tests, simply:
    
    make test

To run our coverage tool:

    make cov


Project Organization
---

### Top level files/directories

The tandem source code is in the **src** folder. Tests are in the **tests** folder.

All other files/directories are just supporting npm/bundler, build, or documentation files.

    build - build output
    demo - demos
    doc - additional documentation
    lib - bundler
    scripts - test coverage script
    src - source code
    tests - unit tests
    vendor/assets/javascripts/tandem - symlinks to src with .module added before extension
    browser.js - npm
    client.coffee - enable node.js to require src/client, used by unit tests
    Gruntfile.coffee - grunt configs
    index.js - npm
    Makefile - define make commands
    package.json - npm
    tandem-rails.gemspec - bundler

### Version numbers

Until we write a script, version numbers will have to be updated in the following files:

- lib/tandem/version.rb
- package.json
- demo/package.json
