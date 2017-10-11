'use strict';
require('./util/test-init');

const nodePath = require('path');
require('chai').config.includeStack = true;

const nodeRequireNoOp = require('lasso/node-require-no-op');

describe('lasso/config', function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/require-no-op'),
        async function (dir, helpers) {
            const main = require(nodePath.join(dir, 'test.js'));
            const checkError = main.checkError;

            try {
                main.check(nodeRequireNoOp);
            } catch (err) {
                if (checkError) {
                    checkError(err);
                    return;
                }

                throw err;
            }
        });
});
