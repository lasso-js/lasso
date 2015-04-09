'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var path = require('path');
var util = require('./util');
var outputDir = path.join(__dirname, 'build');


require('app-module-path').addPath(path.join(__dirname, 'src'));
describe('lasso/index', function() {
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

    it('should allow for requiring builtins', function(done) {
        var lasso = require('../');
        var myLasso = lasso.create({
            fileWriter: {
                outputDir: outputDir,
                urlPrefix: '/',
                fingerprintsEnabled: false
            },
            bundlingEnabled: true,
            plugins: [
                {
                    plugin: 'lasso-require',
                    config: {
                        includeClient: false
                    }
                }
            ]
        }, __dirname, __filename);

        // var writerTracker = require('./WriterTracker').create(myLasso.writer);
        myLasso.optimizePage({
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
