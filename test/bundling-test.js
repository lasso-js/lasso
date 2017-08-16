'use strict';
const nodePath = require('path');
require('chai').config.includeStack = true;

const WriterTracker = require('./util/WriterTracker');
const rmdirRecursive = require('./util').rmdirRecursive;
const buildDir = nodePath.join(__dirname, 'build');
const lasso = require('../');
const Readable = require('stream').Readable;
const urlReader = require('../lib/util/url-reader');

urlReader.createUrlReadStream = function(url) {
    var readable = new Readable();
    readable.push('EXTERNAL:' + url);
    readable.push(null);
    return readable;
};

describe('lasso/bundling' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/bundling'),
        async function (dir, helpers) {
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

            for (const input of inputs) {
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

                let lassoPageResult;
                try {
                    lassoPageResult = await myLasso.lassoPage(lassoOptions);
                } catch (err) {
                    if (checkError) {
                        checkError(err);
                    } else {
                        throw err;
                    }
                }

                if (checkError) {
                    throw new Error('Error expected');
                }

                check(lassoPageResult, writerTracker, helpers);
                await lasso.flushAllCaches();
            }
        });
});
