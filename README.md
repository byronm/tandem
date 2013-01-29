Tandem Realtime Coauthoring Engine
===

This repository is also both a Rails gem and a Node.js module.


### Top level files/directories

The tandem source code is in the **src** folder. Tests are in the **tests** folder.

All other files/directories are just supporting npm/bundler, build, or documentation files.

    build - js client build target, symbolic link to vendor/assets/javascripts
    includes - browser js dependencies
    lib - bundler
    src - source code
    tests - tests written for Mocha on node.js
    vendor/assets/javascripts - Client library dependencies and js build target
    grunt.js - js build tool
    index.js - npm
    package.json - npm
    tandem.gemspec - bundler


### Rails Bundler

Popular javascript libraries are offically included as dependencies. Less popular libraries are included here in the includes folder and will be concatenated as part of the build process.


### Version numbers

Until we write a script, version numbers will have to be updated in the following files:

- lib/tandem/version.rb
- grunt.js
- package.json
