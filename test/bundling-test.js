'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var nodePath = require('path');
var util = require('./util');
var outputDir = nodePath.join(__dirname, 'build');
require('app-module-path').addPath(nodePath.join(__dirname, 'src'));
describe('lasso/bundling', function() {
    beforeEach(function(done) {
        util.rmdirRecursive(outputDir);
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }
        require('raptor-promises').enableLongStacks();
        require('raptor-logging').configureLoggers({
            'lasso': 'WARN',
            'raptor-cache': 'WARN'
        });
        done();
    });
    it('should bundle correctly with recurseInto set to "all"', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            bundles: [
                {
                    name: 'foo',
                    dependencies: [
                        // Specified for a single dependency:
                        { path: 'require: foo', recurseInto: 'all' }
                    ]
                }
            ]
        }, nodePath.join(__dirname, 'test-bundling-project'), __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                        'require: ./main'
                    ],
                from: nodePath.join(__dirname, 'test-bundling-project')
            },
            function(err, lassoPageResult) {
                if (err) {
                    return done(err);
                }

                var fooCode = writerTracker.getCodeForFilename('foo.js');
                expect(fooCode).to.not.contain('[MAIN]');
                expect(fooCode).to.contain('[FOO]');
                expect(fooCode).to.contain('[FOO_INDEX]');
                expect(fooCode).to.contain('[BAR]');
                expect(fooCode).to.contain('[BAZ]');
                done();
            });
    });

    it('should bundle correctly with recurseInto set to "dir"', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            bundles: [
                {
                    name: 'foo',
                    dependencies: [
                        // Specified for a single dependency:
                        { path: 'require: foo', recurseInto: 'dir' }
                    ]
                }
            ]
        }, nodePath.join(__dirname, 'test-bundling-project'), __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                        'require: ./main'
                    ],
                from: nodePath.join(__dirname, 'test-bundling-project')
            },
            function(err, lassoPageResult) {
                if (err) {
                    return done(err);
                }

                var fooCode = writerTracker.getCodeForFilename('foo.js');
                expect(fooCode).to.not.contain('[MAIN]');
                expect(fooCode).to.not.contain('[FOO]');
                expect(fooCode).to.contain('[FOO_INDEX]');
                expect(fooCode).to.not.contain('[BAR]');
                expect(fooCode).to.not.contain('[BAZ]');
                done();
            });
    });

    it('should bundle correctly with recurseInto set to "dirtree"', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            bundles: [
                {
                    name: 'foo',
                    dependencies: [
                        // Specified for a single dependency:
                        { path: 'require: foo', recurseInto: 'dirtree' }
                    ]
                }
            ]
        }, nodePath.join(__dirname, 'test-bundling-project'), __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                        'require: ./main'
                    ],
                from: nodePath.join(__dirname, 'test-bundling-project')
            },
            function(err, lassoPageResult) {
                if (err) {
                    return done(err);
                }

                var fooCode = writerTracker.getCodeForFilename('foo.js');
                expect(fooCode).to.not.contain('[MAIN]');
                expect(fooCode).to.contain('[FOO]');
                expect(fooCode).to.contain('[FOO_INDEX]');
                expect(fooCode).to.contain('[BAR]');
                expect(fooCode).to.not.contain('[BAZ]');
                done();
            });
    });

    it('should bundle correctly with recurseInto set to "module"', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            bundles: [
                {
                    name: 'foo',
                    dependencies: [
                        // Specified for a single dependency:
                        { path: 'require: foo', recurseInto: 'module' }
                    ]
                }
            ]
        }, nodePath.join(__dirname, 'test-bundling-project'), __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                        'require: ./main'
                    ],
                from: nodePath.join(__dirname, 'test-bundling-project')
            },
            function(err, lassoPageResult) {
                if (err) {
                    return done(err);
                }

                var fooCode = writerTracker.getCodeForFilename('foo.js');
                expect(fooCode).to.not.contain('[MAIN]');
                expect(fooCode).to.contain('[FOO]');
                expect(fooCode).to.contain('[FOO_INDEX]');
                expect(fooCode).to.not.contain('[BAR]');
                expect(fooCode).to.not.contain('[BAZ]');
                done();
            });
    });

    it('should bundle correctly with no bundles', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            bundles: [
            ]
        }, nodePath.join(__dirname, 'test-bundling-project'), __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'testPage',
                dependencies: [
                        'require: ./main'
                    ],
                from: nodePath.join(__dirname, 'test-bundling-project')
            },
            function(err, lassoPageResult) {
                if (err) {
                    return done(err);
                }

                var fooCode = writerTracker.getCodeForFilename('testPage.js');
                expect(fooCode).to.contain('[MAIN]');
                expect(fooCode).to.contain('[FOO]');
                expect(fooCode).to.contain('[FOO_INDEX]');
                expect(fooCode).to.contain('[BAR]');
                expect(fooCode).to.contain('[BAZ]');
                done();
            });
    });

    it('should support default bundling strategy', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            bundles: [
                {
                    name: 'everything',
                    dependencies: [
                        'a.js',
                        'b.js',
                        'c.js'
                    ]
                }
            ]
        }, nodePath.join(__dirname, 'test-bundling-strategies-project'), __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'default',
                dependencies: [
                    'a.js'
                ],
                from: nodePath.join(__dirname, 'test-bundling-strategies-project')
            },
            function(err, lassoPageResult) {
                if (err) {
                    return done(err);
                }

                var fooCode = writerTracker.getCodeForFilename('everything.js');
                expect(fooCode).to.equal('a\n\nb\n\nc\n');
                done();
            });
    });

    it('should support lean bundling strategy', function(done) {
        var lasso = require('../');
        var theLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: false
            },
            flags: ['jquery', 'browser'],
            bundlingStrategy: 'lean',
            bundles: [
                {
                    name: 'everything',
                    dependencies: [
                        'a.js',
                        'b.js',
                        'c.js'
                    ]
                }
            ]
        }, nodePath.join(__dirname, 'test-bundling-strategies-project'), __filename);

        var writerTracker = require('./WriterTracker').create(theLasso.writer);
        theLasso.lassoPage({
                pageName: 'default',
                dependencies: [
                    'a.js',
                    'a.js'
                ],
                from: nodePath.join(__dirname, 'test-bundling-strategies-project')
            },
            function(err, lassoPageResult) {
                if (err) {
                    return done(err);
                }

                var fooCode = writerTracker.getCodeForFilename('everything.js');

                // only the contents of a.js will be included in the resultant page bundle
                expect(fooCode).to.equal('a\n');
                done();
            });
    });
});
