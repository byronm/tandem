/*global module:false*/
module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-coffee');

  grunt.initConfig({
    meta: {
      version: '0.1.3',
      banner: 
        '// Tandem Realtime Coauthoring Engine - v<%= meta.version %> - ' +
          '//<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '// https://www.stypi.com/\n' +
        '// Copyright (c) <%= grunt.template.today("yyyy") %>\n' +
        '// Byron Milligan, Salesforce.com\n' + 
        '// Jason Chen, Salesforce.com\n'
    },
    coffee: {
      tandem: {
        files: {
          'build/tandem.js':  ['src/core.coffee', 'src/client/*.coffee'],
        }
      }
    },
    concat: {
      tandem: {
        src: ['<banner:meta.banner>', 'src/client/dependencies.js', 'includes/*.js', 'build/tandem.js'],
        dest: 'build/tandem.js'
      }
    }
  });

  grunt.registerTask('default', 'coffee concat');
};
