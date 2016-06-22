'use strict';
var nodePath = require('path');
require('chai').config.includeStack = true;
var rmdirRecursive = require('./util').rmdirRecursive;
var lasso = require('../');
var buildDir = nodePath.join(__dirname, 'build');

describe('lasso/api' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/api'),
        function (dir, helpers, done) {
            var name = nodePath.basename(dir);
            var outputDir = nodePath.join(buildDir, name);
            rmdirRecursive(outputDir);
            helpers.getName = function() {
                return name;
            };
            helpers.getOutputDir = function() {
                return outputDir;
            };

            var main = require(nodePath.join(dir, 'test.js'));
            main.check(lasso, helpers, done);
        });

});