'use strict';
var nodePath = require('path');
require('chai').config.includeStack = true;
var series = require('raptor-async/series');

var rmdirRecursive = require('./util').rmdirRecursive;

var buildDir = nodePath.join(__dirname, 'build');

var lasso = require('../');

describe('lasso/resource-transforms' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'resource-transforms-autotest'),
        function (dir, done) {

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

            var asyncTasks = inputs.map((input, i) => {
                return (callback) => {
                    var path = input.path;
                    var options = input.options;

                    myLasso.lassoResource(path, options, function(err, result) {
                        if (err) {
                            callback(err);
                        }

                        process.nextTick(() => {
                            try {
                                input.check(result);
                            } catch(e) {
                                return callback(`The inputs at index ${i} failed: ${e.stack}`);
                            }

                            callback();
                        });
                    });
                };
            });

            series(asyncTasks, function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
        });

});