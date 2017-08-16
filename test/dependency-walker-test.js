'use strict';

const nodePath = require('path');
require('chai').config.includeStack = true;
const ok = require('assert').ok;
const normalizeOutput = require('./util/normalizeOutput');

const DependencyTree = require('../lib/DependencyTree');
const lasso = require('../');

describe('lasso/dependency-walker', function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/dependency-walker'),
        async function (dir, helpers) {
            var dependencyWalker = require('../lib/dependency-walker');
            var LassoManifest = require('../lib/LassoManifest');

            var tree = new DependencyTree();

            var main = require(nodePath.join(dir, 'test.js'));

            var dependencies = main.getDependencies(dir);
            var dependencyRegistry = lasso.getDefaultLasso().getDependencyRegistry();
            ok(dependencyRegistry);

            var flags;
            if (main.getFlags) {
                flags = main.getFlags(dir);
            }

            var lassoContext = lasso.getDefaultLasso().createLassoContext({
                flags: flags
            });

            var lassoManifest = new LassoManifest({
                manifest: {
                    dependencies
                },
                dependencyRegistry: dependencyRegistry,
                dirname: dir
            });

            var walkOptions = {};
            walkOptions.lassoManifest = lassoManifest;
            walkOptions.lassoContext = lassoContext;
            walkOptions.on = {
                dependency: function(dependency, lassoContext) {
                    tree.add(dependency, lassoContext.parentDependency);
                }
            };

            await dependencyWalker.walk(walkOptions);

            var output = tree.toString();
            output = normalizeOutput(output, dir);

            helpers.compare(output, '.txt');
        });
});
