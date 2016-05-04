'use strict';
var nodePath = require('path');
require('chai').config.includeStack = true;
var series = require('raptor-async/series');

var WriterTracker = require('./util/WriterTracker');
var rmdirRecursive = require('./util').rmdirRecursive;
var buildDir = nodePath.join(__dirname, 'build');

var lasso = require('../');

describe('lasso/bundling' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'bundling-autotest'),
        function (dir, done) {

            var main = require(nodePath.join(dir, 'test.js'));
            var testName = nodePath.basename(dir);
            var pageName = 'bundling-' + testName;

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


            rmdirRecursive(lassoConfig.outputDir);

            var myLasso = lasso.create(lassoConfig, dir);

            var inputs;

            if (main.getInputs) {
                inputs = main.getInputs();
            } else {
                let lassoOptions = main.getLassoOptions(dir) || {};
                let check = main.check;

                inputs = [
                    {
                        lassoOptions,
                        check
                    }
                ];
            }


            var asyncTasks = inputs.map((input) => {
                return (callback) => {
                    var writerTracker = WriterTracker.create(myLasso.writer);

                    var lassoOptions = input.lassoOptions;
                    var check = input.check;
                    var checkError = input.checkError;

                    if (!lassoOptions.pageName) {
                        lassoOptions.pageName = pageName;
                    }

                    if (!lassoOptions.from) {
                        lassoOptions.from = dir;
                    }

                    myLasso.lassoPage(lassoOptions)
                        .then((lassoPageResult) => {
                            if (checkError) {
                                return done('Error expected');
                            }
                            check(lassoPageResult, writerTracker);
                            lasso.flushAllCaches(callback);
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

            series(asyncTasks, (err) => {
                if (err) {
                    return done(err);
                }

                done();
            });


        });

});