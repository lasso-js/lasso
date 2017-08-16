'use strict';

const nodePath = require('path');
require('chai').config.includeStack = true;

const nodeRequireNoOp = require('../node-require-no-op');

describe('lasso/config', function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/require-no-op'),
        async function (dir, helpers) {
            const main = require(nodePath.join(dir, 'test.js'));
            main.check(nodeRequireNoOp);
        });
});
