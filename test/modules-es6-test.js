'use strict';
var nodePath = require('path');
require('chai').config.includeStack = true;

var sandboxLoad = require('./util').sandboxLoad;
var rmdirRecursive = require('./util').rmdirRecursive;
var writeTestHtmlPage = require('./util').writeTestHtmlPage;

var buildDir = nodePath.join(__dirname, 'build');

var lasso = require('../');

describe('lasso/modules-es6' , function() {
    this.timeout(15000); // Babel is really slow to load...
    
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'fixtures/modules-es6-autotest'),
        function (dir, done) {

            var main = require(nodePath.join(dir, 'test.js'));
            var testName = nodePath.basename(dir);
            var pageName = 'modules-es6-' + testName;

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

            myLasso.lassoPage(lassoOptions)
                .then((lassoPageResult) => {
                    writeTestHtmlPage(lassoPageResult, nodePath.join(buildDir, pageName + '/test.html'));
                    var sandbox = sandboxLoad(lassoPageResult);
                    main.check(sandbox.window);
                    done();
                })
                .catch(done);
        });

});