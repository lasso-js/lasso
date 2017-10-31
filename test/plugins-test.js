'use strict';
var nodePath = require('path');
require('chai').config.includeStack = true;

var WriterTracker = require('./util/WriterTracker');
var rmdirRecursive = require('./util').rmdirRecursive;
var normalizeOutput = require('./util/normalizeOutput');

var buildDir = nodePath.join(__dirname, 'build');

var lasso = require('../');

describe('lasso/plugins' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/plugins'),
        function (dir, helpers, done) {
            helpers.normalizeOutput = normalizeOutput;
            var main = require(nodePath.join(dir, 'test.js'));
            var testName = nodePath.basename(dir);
            var pageName = 'plugins-' + testName;

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

            var lassoOptions = main.getLassoOptions(dir);
            lassoOptions.pageName = pageName;
            lassoOptions.from = dir;

            var writerTracker = WriterTracker.create(myLasso.writer);

            myLasso.lassoPage(lassoOptions)
                .then((lassoPageResult) => {
                    if (main.checkError) {
                        return done('Error expected');
                    }

                    main.check(lassoPageResult, writerTracker, helpers);
                    lasso.flushAllCaches(done);
                })
                .catch((err) => {
                    if (main.checkError) {
                        main.checkError(err);
                        done();
                    } else {
                        throw err;
                    }
                })
                .catch(done);
        });
});
