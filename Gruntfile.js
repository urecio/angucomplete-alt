module.exports = function (grunt) {
    'use strict';

    var initConfig;

    // Loading external tasks
    require('load-grunt-tasks')(grunt);

    // Project configuration.
    initConfig = {
        bower: 'bower_components',
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            dist: {
                src: [
                    'bower_components/angular-loading-bar/build/loading-bar.js',
                    'angucomplete-alt.js'],
                dest: 'build/angucomplete-alt-all.js'
            }
        },
        concat_css: {
            all: {
                files: {'build/angucomplete-alt-all.css':['bower_components/angular-loading-bar/build/loading-bar.css','angucomplete-alt.css']},
            }
        },
        watch: {
            test: {
                // Lint & run unit tests in Karma
                // Just running `$ grunt watch` will only lint your code; to run tests
                // on watch, use `$ grunt watch:karma` to start a Karma server first
                tasks: ['jshint', 'karma:unit:run']
            },
            scripts: {
                files: [
                    'bower_components/angular-loading-bar/build/loading-bar.js',
                    'angucomplete-alt.js'],
                tasks: ['makedist']
            }
        },
        karma: {
            options: {
                configFile: 'test/karma.conf.js',
                browsers: ['PhantomJS']
            },
            unit: {
                singleRun: true
            },
            watch: {
                autoWatch: true
            },
            server: {
                background: true
            }

        },
        jshint: {
            all:[
                'gruntFile.js',
                'angucomplete-alt.js',
                'test/**/*.spec.js'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        changelog: {
            options: {
                dest: 'CHANGELOG.md'
            }
        }

    };

    // Register tasks
    grunt.registerTask('default', ['jshint', 'karma:unit', 'makedist']);
    grunt.registerTask('watch', ['jshint', 'karma:watch']);
    grunt.registerTask('makedist',['concat','concat_css']);

    grunt.initConfig(initConfig);
};


