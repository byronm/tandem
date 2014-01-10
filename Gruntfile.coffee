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
      client:
        options:
          extensions: ['.js', '.coffee']
          standalone: 'Tandem'
          transform: ['coffeeify']
        files: [{ dest: 'build/tandem.js', src: ['browser.js'] }]

    concat:
      options:
        banner: 
          '/*! Tandem Realtime Coauthoring Engine - v<%= meta.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
          ' *  https://www.stypi.com/\n' +
          ' *  Copyright (c) <%= grunt.template.today("yyyy") %>\n' +
          ' *  Jason Chen, Salesforce.com\n' +
          ' *  Byron Milligan, Salesforce.com\n' + 
          ' */\n\n'
      'build/tandem.all.js': [
        'node_modules/async/lib/async.js'
        'node_modules/eventemitter2/lib/eventemitter2.js'
        'node_modules/lodash/lodash.js'
        'node_modules/socket.io-client/dist/socket.io.js'
        'build/tandem.js'
      ]
      'build/tandem.js': ['build/tandem.js']

    watch:
      files: ['src/**/*.coffee']
      tasks: ['default']
  )

  grunt.registerTask('default', ['clean', 'coffee', 'browserify', 'concat'])
