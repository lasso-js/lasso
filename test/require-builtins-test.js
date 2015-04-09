'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var path = require('path');
var util = require('./util');
var outputDir = path.join(__dirname, 'build');


require('app-module-path').addPath(path.join(__dirname, 'src'));
describe('optimizer/index', function() {
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

    it('should allow for requiring builtins', function(done) {
        var optimizer = require('../');
        var pageOptimizer = optimizer.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: true,
            plugins: [
                {
                    plugin: 'optimizer-require',
                    config: {
                        includeClient: false
                    }
                }
            ]
        }, __dirname, __filename);

        // var writerTracker = require('./WriterTracker').create(pageOptimizer.writer);
        pageOptimizer.optimizePage({
                pageName: 'testPage',
                dependencies: [
                    './browser.json'
                ],
                from: path.join(__dirname, 'test-builtins-project').replace(/\\/g, '/')
            }, function(err, optimizedPage) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });
});
