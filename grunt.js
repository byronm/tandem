/*global module:false*/
module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-coffee');

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
      tandem: {
        src: ['<banner:meta.banner>', 'src/client/dependencies.coffee', 'src/core.coffee', 'src/client/{engine,file,network,tandem}.coffee'],
        dest: 'build/tandem.coffee'
      }
    },
    coffee: {
      tandem: {
        src: ['src/core.coffee', 'src/server/*.coffee'],
        dest: 'build/server',
        options: {
          bare: false
        }
      }
    }
  });

  // Default task.
  grunt.registerTask('default', 'concat coffee');

};
