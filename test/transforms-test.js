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


describe('optimizer/transforms', function() {
    beforeEach(function(done) {
        util.rmdirRecursive(outputDir);
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }
        require('raptor-promises').enableLongStacks();
        require('raptor-logging').configureLoggers({
            'optimizer': 'WARN',
            'raptor-cache': 'WARN'
        });
        done();
    });

    it('should allow resources to be transformed', function(done) {
        var optimizer = require('../');

        var results = {};

        var plugin = function(pageOptimizer, pluginConfig) {
            pageOptimizer.addTransform({
                contentType: ['foo', 'bar'],

                name: 'testTransformer',

                stream: true,

                transform: function(stream, contentType, optimizerContext, callback) {
                    var deferredStream = optimizerContext.deferredStream(function() {
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

                                results[optimizerContext.path] = str;

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

        var pageOptimizer = optimizer.create({
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

});
