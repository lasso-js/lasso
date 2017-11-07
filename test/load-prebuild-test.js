'use strict';
require('./util/test-init');

const nodePath = require('path');
require('chai').config.includeStack = true;

const lasso = require('lasso');

describe('lasso/flags', function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/load-prebuild'),
        async function (dir, helpers) {
            const main = require(nodePath.join(dir, 'test.js'));
            let lassoConfig = main.getLassoConfig && main.getLassoConfig();

            if (!lassoConfig) {
                lassoConfig = {
                    bundlingEnabled: false,
                    fingerprintsEnabled: false
                };
            }

            const myLasso = lasso.create(lassoConfig, dir);

            try {
                await main.check(myLasso);
            } catch (err) {
                if (main.checkError) {
                    return main.checkError(err);
                } else {
                    throw err;
                }
            }

            if (main.checkError) {
                throw new Error('Error expected');
            }

            await lasso.flushAllCaches();
        });
});
