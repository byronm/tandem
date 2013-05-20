module.exports = (grunt) ->

  grunt.loadNpmTasks('grunt-coffeeify')
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-watch')

  grunt.initConfig(
    meta:
      version: '0.8.3'

    coffee:
      tests:
        expand: true
        dest: 'build/'
        src: ['tests/client/*.coffee']
        ext: '.js'

    coffeeify: 
      options:
        requires: ['tandem-core/delta.js']
      files:
        { dest: 'build/tandem.js', src: ['browser.js'] }

    concat:
      options:
        banner: 
          '/*! Tandem Realtime Coauthoring Engine - v<%= meta.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
          ' *  https://www.stypi.com/\n' +
          ' *  Copyright (c) <%= grunt.template.today("yyyy") %>\n' +
          ' *  Jason Chen, Salesforce.com\n' +
          ' *  Byron Milligan, Salesforce.com\n' + 
          ' */\n\n'
      'build/tandem.js': ['build/tandem.js'],
      'build/tandem.all.js': [
        'node_modules/async/lib/async.js'
        'node_modules/socket.io-client/dist/socket.io.js'
        'node_modules/underscore/underscore.js'
        'vendor/assets/javascripts/eventemitter2.js'
        'build/tandem.js'
      ]

    watch:
      files: ['src/client/*.coffee', 'node_modules/tandem-core/src/*']
      tasks: ['default']
  )

  grunt.registerTask('default', ['coffee', 'coffeeify', 'concat'])
