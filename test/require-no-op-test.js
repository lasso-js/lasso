'use strict';
var nodePath = require('path');
require('chai').config.includeStack = true;

var nodeRequireNoOp = require('../node-require-no-op');

describe('lasso/config' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/require-no-op'),
        function (dir, helpers, done) {
            var main = require(nodePath.join(dir, 'test.js'));
            main.check(nodeRequireNoOp);
            done();
        });

});