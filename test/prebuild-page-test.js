'use strict';
require('./util/test-init');

const nodePath = require('path');
require('chai').config.includeStack = true;
const glob = require('util').promisify(require('glob'));
const lasso = require('lasso');
const expect = require('chai').expect;

function replaceLassoVersion (str) {
    return str?.replace(/lasso[^?=\\\/]*/g, 'lasso');
}

function replaceLassoSlotURLS (slot) {
    for (const content of slot.content) {
        if (typeof content.code === "object") {
            content.code.href = replaceLassoVersion(content.code.href);
            content.code.src = replaceLassoVersion(content.code.src);
        } else {
            content.code = replaceLassoVersion(content.code);
        }
    }
} 

function replaceLasstAssetURLS (asset) {
    asset.url = replaceLassoVersion(asset.url);
    asset.outputFile = "";
    asset.sourceFile = "";
}

function replaceLassoSlotVersion (prebuild) {
    for (let i = 0; i < prebuild.length; i++) {
        for (const name in prebuild[i].slots) {
            for (const slot of prebuild[i].slots[name]) {
                replaceLassoSlotURLS(slot);
            }
        }

        for (const asset of prebuild[i].assets) {
            replaceLasstAssetURLS(asset);
        }
    }

    return prebuild;
}

describe('lasso/flags', function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'autotests/prebuild-page'),
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

            if (main.prebuildConfig) {
                try {
                    await myLasso.prebuildPage(main.prebuildConfig);
                } catch (err) {
                    if (main.checkError) {
                        return main.checkError(err);
                    } else {
                        throw err;
                    }
                }
            }

            if (main.checkError) {
                throw new Error('Error expected!');
            }

            if (main.check) {
                await main.check(myLasso);
            } else {
                const files = await glob('*.prebuild.json', { cwd: dir });

                for (const file of files) {
                    const prebuildPageName = file.split('.')[0];
                    let actualPrebuild = require(nodePath.join(dir, file));
                    actualPrebuild = replaceLassoSlotVersion(actualPrebuild);

                    const expectedPrebuildFilePath = nodePath.join(dir, `${prebuildPageName}.prebuild.expected.json`);
                    let expectedPrebuild = require(expectedPrebuildFilePath);
                    expectedPrebuild = replaceLassoSlotVersion(expectedPrebuild);
                    expect(actualPrebuild).to.deep.equal(expectedPrebuild);
                }
            }

            if (main.checkError) {
                throw new Error('Error expected');
            }

            await lasso.flushAllCaches();
        });
});
