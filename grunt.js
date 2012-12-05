/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    meta: {
      version: '0.1.0',
      banner: '# Tandem Operational Transform Engine - v<%= meta.version %> - ' +
        '#<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '# https://www.stypi.com/\n' +
        '# Copyright (c) <%= grunt.template.today("yyyy") %>\n' +
        '# Byron Milligan, Salesforce.com\n' + 
        '# Jason Chen, Salesforce.com'
    },
    concat: {
      dist: {
        src: ['<banner:meta.banner>', 'src/*.coffee'],
        dest: 'build/tandem.coffee'
      }
    },
    uglify: {}
  });

  // Default task.
  grunt.registerTask('default', 'concat');

};
