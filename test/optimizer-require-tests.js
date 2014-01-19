'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var nodePath = require('path');
var fs = require('fs');

require('app-module-path').addPath(nodePath.join(__dirname, 'src'));

describe('raptor-optimizer' , function() {

    beforeEach(function(done) {
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }

        require('raptor-promises').enableLongStacks();

        require('raptor-logging').configureLoggers({
            'raptor-optimizer': 'WARN'
        });

        done();
    });

    it.only('should handle de-duplication correctly', function(done) {
        var writer = require('./MockWriter').create({
            outputDir: 'build',
            checksumsEnabled: false
        });
        var optimizer = require('../');

        optimizer.configure({
                enabledExtensions: ['jquery', 'browser']
            }, __dirname, __filename)
            .then(function(pageOptimizer) {
                return pageOptimizer.optimizePage({
                        pageName: "testPage",
                        writer: writer,
                        dependencies: [
                            { "require": "foo" },
                            { "require": "bar" }],
                        from: nodePath.join(__dirname, 'test-project/index.js')
                    });
            })
            .then(function(optimizedPage) {
                // console.log('writer: ', writer);
                expect(writer.getOutputPaths()).to.deep.equal([
                        nodePath.join(__dirname, 'build/testPage.js')
                    ]);

                console.log(writer.getCodeForFilename('testPage.js'));

                expect(writer.getCodeForFilename('testPage.js')).to.equal(
                    fs.readFileSync(nodePath.join(__dirname, 'resources/foo-bar-bundle.js'), {encoding: 'utf8'}));
            })
            .then(done)
            .fail(done);
    });
});

