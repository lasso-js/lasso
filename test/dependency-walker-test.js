'use strict';
var nodePath = require('path');
require('chai').config.includeStack = true;
var ok = require('assert').ok;
var relativizePaths = require('./util/relativizePaths');

var DependencyTree = require('../lib/DependencyTree');
var lasso = require('../');

describe('lasso/dependency-walker' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'dependency-walker-autotest'),
        function (dir, helpers, done) {

            var dependencyWalker = require('../lib/dependency-walker');
            var LassoManifest = require('../lib/LassoManifest');

            var tree = new DependencyTree();

            var main = require(nodePath.join(dir, 'test.js'));

            var dependencies = main.getDependencies(dir);
            var dependencyRegistry = lasso.getDefaultLasso().getDependencyRegistry();
            ok(dependencyRegistry);

            var lassoContext = lasso.getDefaultLasso().createLassoContext();

            var lassoManifest = new LassoManifest({
                manifest: {
                    dependencies:dependencies
                },
                dependencyRegistry: dependencyRegistry,
                dirname: dir
            });


            var walkOptions;
            if (main.getWalkOptions) {
                walkOptions = main.getWalkOptions(dir);
            }

            if (!walkOptions) {
                walkOptions = {
                        lassoManifest: lassoManifest,
                        flags: ['jquery', 'browser'],
                        lassoContext: lassoContext,
                        on: {
                            dependency: function(dependency, lassoContext) {
                                tree.add(dependency, lassoContext.parentDependency);
                            }
                        }
                    };
            }

            dependencyWalker.walk(walkOptions, function(err) {
                    if (err) {
                        return done(err);
                    }

                    var output = tree.toString();
                    output = relativizePaths(output, dir);

                    helpers.compare(output, '.txt');
                    done();
                });
        });

});