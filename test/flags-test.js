'use strict';
var nodePath = require('path');
require('chai').config.includeStack = true;

var WriterTracker = require('./util/WriterTracker');
var rmdirRecursive = require('./util').rmdirRecursive;
var buildDir = nodePath.join(__dirname, 'build');

var lasso = require('../');

describe('lasso/flags' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/flags'),
        function (dir, helpers, done) {

            var main = require(nodePath.join(dir, 'test.js'));
            var testName = nodePath.basename(dir);
            var pageName = 'flags-' + testName;

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
                    main.check(lassoPageResult, writerTracker);
                    lasso.flushAllCaches(done);
                })
                .catch(done);
        });

});