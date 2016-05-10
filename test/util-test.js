'use strict';
var nodePath = require('path');
require('chai').config.includeStack = true;
var util = require('../lib/util');

describe('lasso/util' , function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'util-autotest'),
        function (dir, helpers, done) {
            var main = require(nodePath.join(dir, 'test.js'));
            main.check(util, done);
        });

});