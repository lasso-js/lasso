'use strict';
require('./util/test-init');

const nodePath = require('path');
require('chai').config.includeStack = true;
const util = require('lasso/util');

describe('lasso/util', function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/util'),
        async function (dir, helpers) {
            var main = require(nodePath.join(dir, 'test.js'));
            return main.check(util);
        });
});
