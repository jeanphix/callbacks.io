/*jslint node: true*/
module.exports = function (grunt) {
    "use strict";
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        handlebars: {
            compile: {
                options: {
                    namespace: "JST",
                    compilerOptions: {
                        knownHelpers: {
                            "keyvalue": true
                        }
                    }
                },
                files: {
                    "static/scripts/views/callback.js": "views/partials/callback.hbs"
                }
            }
        },
        watch: {
            styles: {
                files: 'styles/*',
                tasks: ['stylus']
            },
            scripts: {
                files: '**/*.js',
                tasks: ['express:dev']
            },
            handlebars: {
                files: '**/*.hbs',
                tasks: ['handlebars']
            },
            options: {
                spawn: false
            }
        },
        stylus: {
            compile: {
                files: {
                    'static/style.css': 'styles/style.styl'
                }
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
    grunt.loadNpmTasks('grunt-contrib-handlebars');
    grunt.loadNpmTasks('grunt-contrib-stylus');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-express-server');

    grunt.registerTask('server', [ 'express:dev', 'watch' ]);
};
