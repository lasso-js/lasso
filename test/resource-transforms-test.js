'use strict';
const nodePath = require('path');
require('chai').config.includeStack = true;

const rmdirRecursive = require('./util').rmdirRecursive;
const buildDir = nodePath.join(__dirname, 'build');
const lasso = require('../');

describe('lasso/resource-transforms', function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/resource-transforms'),
        async function (dir, helpers) {
            var main = require(nodePath.join(dir, 'test.js'));
            var testName = nodePath.basename(dir);
            var pageName = 'resource-transforms-' + testName;

            var lassoConfig = main.getLassoConfig && main.getLassoConfig();
            if (!lassoConfig) {
                lassoConfig = {
                    bundlingEnabled: false,
                    fingerprintsEnabled: false
                };
            }

            if (!lassoConfig.outputDir) {
                lassoConfig.outputDir = nodePath.join(buildDir, pageName);
            }

            if (!lassoConfig.projectRoot) {
                lassoConfig.projectRoot = dir;
            }

            rmdirRecursive(lassoConfig.outputDir);

            var myLasso = lasso.create(lassoConfig, dir);
            var inputs = main.getInputs();

            let i = 0;
            for (const input of inputs) {
                var path = input.path;
                var options = input.options;

                const result = await myLasso.lassoResource(path, options);
                try {
                    input.check(result);
                } catch (e) {
                    throw new Error(`The inputs at index ${i} failed: ${e.stack}`, e);
                }

                i++;
            }
        });
});
