'use strict';

const nodePath = require('path');
require('chai').config.includeStack = true;

const WriterTracker = require('./util/WriterTracker');
const rmdirRecursive = require('./util').rmdirRecursive;
const buildDir = nodePath.join(__dirname, 'build');

const lasso = require('../');

describe('lasso/flags' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/flags'),
        async function (dir, helpers) {
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

            const lassoPageResult = await myLasso.lassoPage(lassoOptions);
            main.check(lassoPageResult, writerTracker);
            await lasso.flushAllCaches();
        });
});
