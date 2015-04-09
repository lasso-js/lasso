'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var nodePath = require('path');

require('app-module-path').addPath(nodePath.join(__dirname, 'src'));

describe('lasso' , function() {

    beforeEach(function(done) {
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }

        require('raptor-promises').enableLongStacks();

        require('raptor-logging').configureLoggers({
            'lasso': 'WARN'
        });

        done();
    });


    it('should walk dependencies correctly', function(done) {
        var dependencyWalker = require('../lib/dependency-walker');
        var LassoManifest = require('../lib/LassoManifest');
        var LassoContext = require('../lib/LassoContext');
        var DependencyRegistry = require('../lib/dependencies').DependencyRegistry;

        var lassoManifest = new LassoManifest({
            manifest: {
                dependencies: [
                    { 'package': 'asyncA' }
                ]
            },
            dependencyRegistry: new DependencyRegistry(),
            dirname: __dirname
        });

        var lassoContext = new LassoContext();

        var dependencies = [];
        var contexts = [];

        dependencyWalker.walk({
                lassoManifest: lassoManifest,
                flags: ['jquery', 'browser'],
                lassoContext: lassoContext,
                on: {
                    dependency: function(dependency, lassoContext) {

                        dependencies.push(dependency.toString());
                        contexts.push(lassoContext);
                        // At this point we have added the dependency to a bundle and we know the bundle is not asynchronous
                    }
                }
            })
            .then(function() {
                // console.log('Walked dependency tree in ' + (Date.now() - startTime) + 'ms');

                // console.log(JSON.stringify(dependencies, null, 4));

				for(var i=0; i < dependencies.length; i++) {
					dependencies[i] = dependencies[i].replace(/\\\\/g, '\\');
				}

                expect(dependencies).to.deep.equal([
                    '[package: path="' + nodePath.join(__dirname, 'src/asyncA/browser.json') + '"]',
                    '[package: path="' + nodePath.join(__dirname, 'src/moduleA/browser.json') + '"]',
                    '[js: path="' + nodePath.join(__dirname, 'src/moduleA/moduleA.js') + '"]'
                ]);

                done();
            })
            .fail(done);
    });
});
