'use strict';

const nodePath = require('path');
require('chai').config.includeStack = true;

const sandboxLoad = require('./util').sandboxLoad;
const rmdirRecursive = require('./util').rmdirRecursive;
const writeTestHtmlPage = require('./util').writeTestHtmlPage;
const buildDir = nodePath.join(__dirname, 'build');
const lasso = require('../');

describe('lasso/modules', function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/modules'),
        async function (dir, helpers) {
            var main = require(nodePath.join(dir, 'test.js'));
            var testName = nodePath.basename(dir);
            var pageName = 'modules-' + testName;

            var lassoConfig = main.lassoConfig || (main.getLassoConfig && main.getLassoConfig());
            if (!lassoConfig) {
                lassoConfig = {
                    bundlingEnabled: false,
                    fingerprintsEnabled: false
                };
            }

            if (!lassoConfig.outputDir) {
                lassoConfig.outputDir = nodePath.join(buildDir, pageName);
            }

            if (!lassoConfig.urlPrefix) {
                lassoConfig.urlPrefix = './';
            }

            rmdirRecursive(lassoConfig.outputDir);

            var myLasso = lasso.create(lassoConfig, dir);

            var tests = main.tests || [];

            if (main.getLassoOptions) {
                let lassoOptions = main.getLassoOptions(dir);
                let checkError = main.checkError;

                tests.push({
                    check: main.check,
                    checkError: checkError,
                    lassoOptions: lassoOptions
                });
            } else if (main.tests) {
                tests = main.tests;
            } else {
                throw Error('Illegal state');
            }

            for (const test of tests) {
                var lassoOptions = test.lassoOptions;
                if (!lassoOptions.pageName) {
                    lassoOptions.pageName = pageName;
                }

                lassoOptions.from = dir;

                var check = test.check;
                var checkError = test.checkError;
                var modulesRuntimeGlobal = myLasso.config.modulesRuntimeGlobal;

                let lassoPageResult;
                try {
                    lassoPageResult = await myLasso.lassoPage(lassoOptions);
                } catch (err) {
                    if (checkError) {
                        checkError(err);
                        return;
                    } else {
                        throw err;
                    }
                }

                if (checkError) {
                    throw new Error('Error expected');
                }

                writeTestHtmlPage(lassoPageResult, nodePath.join(buildDir, pageName + '/test.html'));
                var sandbox = sandboxLoad(lassoPageResult, modulesRuntimeGlobal);
                sandbox.$outputDir = lassoConfig.outputDir;

                await check(sandbox.window);
            }
        });
});
