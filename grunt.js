/*global module:false*/
module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-browserify');

  grunt.initConfig({
    meta: {
      version: '0.4.1',
      banner: 
        '/*! Tandem Realtime Coauthoring Engine - v<%= meta.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
        ' *  https://www.stypi.com/\n' +
        ' *  Copyright (c) <%= grunt.template.today("yyyy") %>\n' +
        ' *  Jason Chen, Salesforce.com\n' +
        ' *  Byron Milligan, Salesforce.com\n' + 
        ' */'
    },
    '//': "Browserify configs must be in the form dest.ext: { entries: 'entries.ext' }. Documentation that says otherwise is lying.",
    browserify: {
      'vendor/assets/javascripts/tandem/tandem.js': {
        entries: 'src/client/tandem.coffee'
      },
      'vendor/assets/javascripts/tandem/tandem-core.js': {
        entries: 'src/client/tandem-core.coffee'
      }
    },
    concat: {
      'vendor/assets/javascripts/tandem/tandem.js': [
        '<banner:meta.banner>',
        'vendor/assets/javascripts/tandem/tandem.js'
      ],
      'vendor/assets/javascripts/tandem/tandem-core.js': [
        '<banner:meta.banner>',
        'vendor/assets/javascripts/tandem/tandem-core.js'
      ],
      'vendor/assets/javascripts/tandem/tandem.all.js': [
        '<banner:meta.banner>', 
        'node_modules/async/lib/async.js',
        'node_modules/socket.io/node_modules/socket.io-client/dist/socket.io.js',
        'node_modules/underscore/underscore.js',
        'vendor/assets/javascripts/eventemitter2.js',
        'vendor/assets/javascripts/tandem/tandem.js'
      ]
    }
  });

  grunt.registerTask('default', 'browserify concat');
};
