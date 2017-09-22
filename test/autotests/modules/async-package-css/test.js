const expect = require('chai').expect;
const path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundles: [
            {
                name: 'main',
                dependencies: [
                    'require-run: ./main'
                ]
            },
            {
                name: 'something',
                dependencies: [
                    './something.css'
                ]
            }
        ]
    };
};

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            'require-run: ./main'
        ]
    };
};

exports.check = async function (window, lassoPageResult) {
    expect(window.fooLoaded).to.equal(undefined);
    expect(window.main.filename).to.contain('main');

    return new Promise((resolve, reject) => {
        window.main.loadSomething(function(err) {
            if (err) {
                return reject(err);
            }

            expect(lassoPageResult.getCSSUrls())
                .to.deep.equal(['./something.css']);

            expect(lassoPageResult.getUrlByAsyncBundleName('something'))
                .to.equal('./something.css');

            expect(lassoPageResult.getFileByAsyncBundleName('something').endsWith('/something.css'))
                .to.equal(true);

            resolve();
        });
    });
};
