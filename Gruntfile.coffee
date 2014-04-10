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
        src: ['**/*.coffee']
        ext: '.js'

    browserify:
      standard:
        options:
          external: ['async', 'eventemitter2', 'lodash']
          standalone: 'Tandem'
        files: [{ dest: 'build/tandem.js', src: ['browser.js'] }]
      bare:
        options:
          external: ['async', 'lodash', 'eventemitter2', 'socket.io-client']
          standalone: 'Tandem'
        files: [{ dest: 'build/tandem.bare.js', src: ['browser.bare.js'] }]
      all:
        options:
          alias: [
            'bower_components/async/lib/async.js:async'
            'bower_components/eventemitter2/lib/eventemitter2.js:eventemitter2'
            'bower_components/lodash/dist/lodash.js:lodash'
            'bower_components/socket.io-client/dist/socket.io.js:socket.io-client'
          ]
          standalone: 'Tandem'
        files: [{ dest: 'build/tandem.all.js', src: ['browser.js'] }]

    concat:
      options:
        banner:
          '/*! Tandem Realtime Coauthoring Engine - v<%= meta.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
          ' *  Copyright (c) <%= grunt.template.today("yyyy") %>\n' +
          ' *  Jason Chen, Salesforce.com\n' +
          ' *  Byron Milligan, Salesforce.com\n' +
          ' */\n\n'
      'build/tandem.all.js': ['build/tandem.all.js']
      'build/tandem.bare.js': ['build/tandem.bare.js']
      'build/tandem.js': ['build/tandem.js']

    watch:
      files: ['src/**/*.coffee']
      tasks: ['default']
  )

  grunt.registerTask('default', ['clean', 'coffee', 'browserify', 'concat'])
