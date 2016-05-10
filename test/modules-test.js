'use strict';
var nodePath = require('path');
require('chai').config.includeStack = true;

var sandboxLoad = require('./util').sandboxLoad;
var rmdirRecursive = require('./util').rmdirRecursive;
var writeTestHtmlPage = require('./util').writeTestHtmlPage;

var buildDir = nodePath.join(__dirname, 'build');

var lasso = require('../');

describe('lasso/modules' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'modules-autotest'),
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

            var lassoOptions = main.getLassoOptions(dir);
            lassoOptions.pageName = pageName;
            lassoOptions.from = dir;

            var checkError = main.checkError;

            var modulesRuntimeGlobal = myLasso.config.modulesRuntimeGlobal;

            myLasso.lassoPage(lassoOptions)
                .then((lassoPageResult) => {

                    if (checkError) {
                        return done('Error expected');
                    }

                    writeTestHtmlPage(lassoPageResult, nodePath.join(buildDir, pageName + '/test.html'));
                    var sandbox = sandboxLoad(lassoPageResult, modulesRuntimeGlobal);
                    sandbox.$outputDir = lassoConfig.outputDir;
                    if (main.check.length === 2) {
                        main.check(sandbox.window, done);
                    } else {
                        main.check(sandbox.window);
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
        });

});