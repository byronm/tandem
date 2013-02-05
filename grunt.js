/*global module:false*/
module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-browserify');

  grunt.initConfig({
    meta: {
      version: '0.3.2',
      banner: 
        '// Tandem Realtime Coauthoring Engine - v<%= meta.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '// https://www.stypi.com/\n' +
        '// Copyright (c) <%= grunt.template.today("yyyy") %>\n' +
        '// Byron Milligan, Salesforce.com\n' + 
        '// Jason Chen, Salesforce.com\n'
    },
    browserify: {
      'vendor/assets/javascripts/tandem/tandem.js': {
        '//': "Configs must be in the form dest.ext: { entries: 'entries.ext' }. Documentation that says otherwise is lying.",
        entries: 'src/client/tandem.coffee'
      }
    },
    concat: {
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
