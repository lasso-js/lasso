'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var nodePath = require('path');

require('app-module-path').addPath(nodePath.join(__dirname, 'src'));

describe('optimizer' , function() {

    beforeEach(function(done) {
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }

        require('raptor-promises').enableLongStacks();

        require('raptor-logging').configureLoggers({
            'optimizer': 'WARN'
        });

        done();
    });


    it('should walk dependencies correctly', function(done) {
        var dependencyWalker = require('../lib/dependency-walker');
        var OptimizerManifest = require('../lib/OptimizerManifest');
        var OptimizerContext = require('../lib/OptimizerContext');
        var DependencyRegistry = require('../lib/dependencies').DependencyRegistry;

        var optimizerManifest = new OptimizerManifest({
            manifest: {
                dependencies: [
                    { 'package': 'asyncA' }
                ]
            },
            dependencyRegistry: new DependencyRegistry(),
            dirname: __dirname
        });

        var optimizerContext = new OptimizerContext();

        var dependencies = [];
        var contexts = [];

        dependencyWalker.walk({
                optimizerManifest: optimizerManifest,
                enabledExtensions: ['jquery', 'browser'],
                optimizerContext: optimizerContext,
                on: {
                    dependency: function(dependency, optimizerContext) {

                        dependencies.push(dependency.toString());
                        contexts.push(optimizerContext);



                        // At this point we have added the dependency to a bundle and we know the bundle is not asynchronous

                    }
                }
            })
            .then(function() {
                // console.log('Walked dependency tree in ' + (Date.now() - startTime) + 'ms');

                // console.log(JSON.stringify(dependencies, null, 4));

                expect(dependencies).to.deep.equal([
                    '[package: path="' + nodePath.join(__dirname, 'src/asyncA/optimizer.json') + '"]',
                    '[package: path="' + nodePath.join(__dirname, 'src/moduleA/optimizer.json') + '"]',
                    '[js: path="' + nodePath.join(__dirname, 'src/moduleA/moduleA.js') + '"]'
                ]);

                done();
            })
            .fail(done);
    });
});
