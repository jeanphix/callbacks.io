/*jslint node: true*/
module.exports = function (grunt) {
    "use strict";
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            scripts: {
                files: '**/*.js',
                tasks: ['express:dev']
            },
            options: {
                spawn: false
            }
        },
        express: {
            dev: {
                options: {
                    script: 'server.js'
                }
            }
        }
    });
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-express-server');

    grunt.registerTask('server', [ 'express:dev', 'watch' ]);
};
