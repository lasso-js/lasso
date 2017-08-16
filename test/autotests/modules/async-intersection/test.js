const expect = require('chai').expect;

exports.lassoConfig = {
    bundlingEnabled: true,
    fingerprintsEnabled: false,
    bundles: [
        {
            name: 'common',
            dependencies: [
                {
                    "intersection": [
                        'require-run: ' + require.resolve('./main1'),
                        'require-run: ' + require.resolve('./main2')
                    ]
                }
            ]
        }
    ]
};

exports.tests = [
    {
        lassoOptions: {
            pageName: 'main1',
            dependencies: [
                'require-run: ' + require.resolve('./main1')
            ]
        },
        check (window) {
            expect(window.fooLoaded).to.equal(undefined);
            expect(window.main.filename).to.contain('main');

            return new Promise((resolve, reject) => {
                window.main.load(function(err, loaded) {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        expect(window.fooLoaded).to.equal(true);
                        expect(loaded.foo.isFoo).to.equal(true);
                        expect(loaded.helper.isMain1Helper).to.equal(true);
                    } catch (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }
    },
    {
        lassoOptions: {
            pageName: 'main2',
            dependencies: [
                'require-run: ' + require.resolve('./main2')
            ]
        },
        check (window) {
            expect(window.fooLoaded).to.equal(undefined);
            expect(window.main.filename).to.contain('main');

            return new Promise((resolve, reject) => {
                window.main.load(function(err, loaded) {
                    if (err) {
                        return reject(err);
                    }

                    try {
                        expect(window.fooLoaded).to.equal(true);
                        expect(loaded.foo.isFoo).to.equal(true);
                        expect(loaded.helper.isMain2Helper).to.equal(true);
                    } catch (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }
    }
];
