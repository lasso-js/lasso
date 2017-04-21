'use strict';
var series = require('raptor-async/series');
var nodePath = require('path');
require('chai').config.includeStack = true;

var sandboxLoad = require('./util').sandboxLoad;
var rmdirRecursive = require('./util').rmdirRecursive;
var writeTestHtmlPage = require('./util').writeTestHtmlPage;

var buildDir = nodePath.join(__dirname, 'build');

var lasso = require('../');

describe('lasso/modules' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/modules'),
        function (dir, helpers, done) {

            var main = require(nodePath.join(dir, 'test.js'));
            var testName = nodePath.basename(dir);
            var pageName = 'modules-' + testName;

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
            }


            var testTasks = tests.map((test) => {
                return function(done) {

                    var lassoOptions = test.lassoOptions;
                    lassoOptions.pageName = pageName;
                    lassoOptions.from = dir;

                    var check = test.check;
                    var checkError = test.checkError;
                    var modulesRuntimeGlobal = myLasso.config.modulesRuntimeGlobal;

                    myLasso.lassoPage(lassoOptions)
                        .then((lassoPageResult) => {

                            if (checkError) {
                                return done('Error expected');
                            }

                            writeTestHtmlPage(lassoPageResult, nodePath.join(buildDir, pageName + '/test.html'));
                            var sandbox = sandboxLoad(lassoPageResult, modulesRuntimeGlobal);
                            sandbox.$outputDir = lassoConfig.outputDir;
                            if (check.length === 2) {
                                check(sandbox.window, done);
                            } else {
                                check(sandbox.window);
                                done();
                            }


                        })
                        .catch((err) => {
                            if (checkError) {
                                checkError(err);
                                done();
                            } else {
                                throw err;
                            }
                        })
                        .catch(done);
                };
            });

            series(testTasks, done);

        });

});