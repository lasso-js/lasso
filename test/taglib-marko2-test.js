'use strict';
var nodePath = require('path');
require('chai').config.includeStack = true;
var marko = require('marko-v2');
var lasso = require('../');
var rmdirRecursive = require('./util').rmdirRecursive;
var buildDir = nodePath.join(__dirname, 'build');
var fs = require('fs');

require('marko-v2/compiler').defaultOptions.checkUpToDate = false;
require('marko-v2/compiler').defaultOptions.assumeUpToDate = false;

describe('lasso/taglib-marko2' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/taglib-marko2'),
        function (dir, helpers, done) {
            var testName = nodePath.basename(dir);
            var pageName = 'taglib-' + testName;

            var mainPath = nodePath.join(dir, 'test.js');
            var main;

            if (fs.existsSync(mainPath)) {
                main = require(mainPath);
            } else {
                main = {};
            }

            var lassoConfig = main.getLassoConfig && main.getLassoConfig();
            if (!lassoConfig) {
                lassoConfig = {
                    bundlingEnabled: true,
                    fingerprintsEnabled: true
                };
            }

            if (!lassoConfig.outputDir) {
                lassoConfig.outputDir = nodePath.join(buildDir, pageName);
            }

            rmdirRecursive(lassoConfig.outputDir);

            var theLasso = lasso.create(lassoConfig, dir);

            // var main = require(nodePath.join(dir, 'test.js'));
            var templatePath = nodePath.join(dir, 'template.marko');
            var template = marko.load(templatePath);

            var templateData;

            if (main.getTemplateData) {
                templateData = main.getTemplateData();
            }

            if (!templateData) {
                templateData = {};
            }

            if (!templateData.$global) {
                templateData.$global = {};
            }

            templateData.$global.cspNonce = 'abc123';
            templateData.$global.lasso = theLasso;

            templateData.pageName = pageName;

            template.render(templateData, function(err, html) {
                if (err) {
                    return done(err);
                }

                helpers.compare(html, '.html');
                done();
            });
        });

});