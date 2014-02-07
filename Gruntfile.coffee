pkgJson = require('./package.json')

module.exports = (grunt) ->

  grunt.loadNpmTasks('grunt-browserify')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-watch')

  grunt.initConfig(
    meta:
      version: pkgJson.version

    clean: ['build']

    coffee:
      src:
        cwd: 'src/'
        expand: true
        dest: 'build/'
        src: ['server/**/*.coffee']
        ext: '.js'

    browserify: 
      options:
        extensions: ['.js', '.coffee']
        transform: ['coffeeify']
      tandem:
        options:
          external: ['async', 'eventemitter2', 'lodash', 'socket.io-client']
        files: [{ dest: 'build/tandem.js', src: ['browser.js'] }]
      all:
        options:
          alias: [
            'bower_components/async/lib/async.js:async'
            'bower_components/eventemitter2/lib/eventemitter2.js:eventemitter2'
            'bower_components/lodash/dist/lodash.js:lodash'
            'bower_components/socket.io-client/dist/socket.io.js:socket.io-client'
          ]
        files: [{ dest: 'build/tandem.all.js', src: ['browser.js'] }]

    concat:
      options:
        banner: 
          '/*! Tandem Realtime Coauthoring Engine - v<%= meta.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
          ' *  https://www.stypi.com/\n' +
          ' *  Copyright (c) <%= grunt.template.today("yyyy") %>\n' +
          ' *  Jason Chen, Salesforce.com\n' +
          ' *  Byron Milligan, Salesforce.com\n' + 
          ' */\n\n'
      'build/tandem.all.js': [ 'build/tandem.all.js' ]
      'build/tandem.js': ['build/tandem.js']

    watch:
      files: ['src/**/*.coffee']
      tasks: ['default']
  )

  grunt.registerTask('default', ['clean', 'coffee', 'browserify', 'concat', 'requirejsify'])

  grunt.registerTask 'requirejsify', 'wrap tandem.all w/ requirejs', ->
    grunt.file.write 'build/transform.js', [
      #'define("tandem", function(require, exports, module){'
      'define("tandem", ["eventemitter2", "async", "lodash", "module", "exports"], function(EventEmitter2, async, _, module, exports){'
      'EventEmitter2 = require("eventemitter2");'
      grunt.file.read 'build/tandem.all.js'
      '})'
    ].join '\n\n'

