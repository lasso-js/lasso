'use strict';
var nodePath = require('path');
require('chai').config.includeStack = true;

var lasso = require('../');

describe('lasso/config' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/config'),
        function (dir, helpers, done) {
            var main = require(nodePath.join(dir, 'test.js'));
            main.check(lasso);
            done();
        });

});