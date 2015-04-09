'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var nodePath = require('path');
var fs = require('fs');
var util = require('./util');
var series = require('raptor-async/series');

var outputDir = nodePath.join(__dirname, 'build');
require('app-module-path').addPath(nodePath.join(__dirname, 'src'));


describe('lasso/transforms', function() {
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

    it('should allow resources to be transformed', function(done) {
        var lasso = require('../');

        var results = {};

        var plugin = function(pageOptimizer, pluginConfig) {
            pageOptimizer.addTransform({
                contentType: ['foo', 'bar'],

                name: 'testTransformer',

                stream: true,

                transform: function(stream, lassoContext, callback) {
                    var contentType = lassoContext.contentType;

                    var deferredStream = lassoContext.deferredStream(function() {
                        var chunks = [];
                        stream
                            .on('data', function(chunk) {
                                chunks.push(chunk);
                            })
                            .on('error', function(err) {
                                return callback(err);
                            })
                            .on('end', function() {
                                var buffer = Buffer.concat(chunks); // Create a buffer from all the received chunks
                                var str = buffer.toString('utf8');

                                results[lassoContext.path] = str;

                                if (contentType === 'foo') {
                                    deferredStream.push(str + '-FOO');
                                } else if (contentType === 'bar') {
                                    deferredStream.push(str + '-BAR');
                                } else {
                                    throw new Error('Unexpected content type: ', contentType);
                                }

                                deferredStream.push(null);
                            });
                    });

                    return deferredStream;
                }
            });
        };

        var pageOptimizer = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: true
            },
            plugins: [
                {
                    plugin: plugin
                }
            ]
        }, nodePath.join(__dirname, 'test-bundling-project'), __filename);

        var barPath = nodePath.join(__dirname, 'fixtures/transforms/transform.bar');
        var fooPath = nodePath.join(__dirname, 'fixtures/transforms/transform.foo');

        series(
            [
                function(callback) {
                    pageOptimizer.optimizeResource(barPath, function(err, result) {
                        if (err) {
                            return done(err);
                        }
                        var outputFile = result.outputFile;
                        expect(fs.readFileSync(outputFile, 'utf8')).to.equal('hello-BAR');
                        expect(results[barPath]).to.equal('hello');
                        callback();
                    });
                },
                function(callback) {
                    pageOptimizer.optimizeResource(fooPath, function(err, result) {
                            if (err) {
                                return done(err);
                            }
                            var outputFile = result.outputFile;
                            expect(fs.readFileSync(outputFile, 'utf8')).to.equal('world-FOO');
                            expect(results[fooPath]).to.equal('world');
                            callback();
                        });
                }
            ],
            done
        );
    });

    it('should allow resource transforms to be filtered', function(done) {
        var lasso = require('../');

        var plugin = function(pageOptimizer, pluginConfig) {
            pageOptimizer.addTransform({
                filter: function(lassoContext, callback) {
                    var path = lassoContext.path;
                    if (!path) {
                        return callback(null, false);
                    }

                    if (/\.bar$/.test(path)) {
                        callback(null, true);
                    } else {
                        callback(null, false);
                    }
                },

                name: 'testTransformer',

                stream: true,

                transform: function(stream, contentType, lassoContext, callback) {
                    var through = require('through');
                    return stream.pipe(through(
                        function write(chunk) {
                            this.push(chunk);
                        },
                        function end(chunk) {
                            this.push(new Buffer('-TRANSFORMED', 'utf8'));
                            this.push(null);
                        }
                    ));
                }
            });
        };

        var pageOptimizer = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                fingerprintsEnabled: true
            },
            plugins: [
                {
                    plugin: plugin
                }
            ]
        }, nodePath.join(__dirname, 'test-bundling-project'), __filename);

        var barPath = nodePath.join(__dirname, 'fixtures/transforms/transform.bar');
        var fooPath = nodePath.join(__dirname, 'fixtures/transforms/transform.foo');

        series(
            [
                function(callback) {
                    pageOptimizer.optimizeResource(barPath, function(err, result) {
                        if (err) {
                            return done(err);
                        }
                        var outputFile = result.outputFile;
                        expect(fs.readFileSync(outputFile, 'utf8')).to.equal('hello-TRANSFORMED');
                        callback();
                    });
                },
                function(callback) {
                    pageOptimizer.optimizeResource(fooPath, function(err, result) {
                            if (err) {
                                return done(err);
                            }
                            var outputFile = result.outputFile;
                            expect(fs.readFileSync(outputFile, 'utf8')).to.equal('world');
                            callback();
                        });
                }
            ],
            done);
    });

});
