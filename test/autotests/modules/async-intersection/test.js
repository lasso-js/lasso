var expect = require('chai').expect;


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
        check(window, done) {
            expect(window.fooLoaded).to.equal(undefined);
            expect(window.main.filename).to.contain('main');

            window.main.load(function(err, loaded) {
                if (err) {
                    return done(err);
                }

                expect(window.fooLoaded).to.equal(true);
                expect(loaded.foo.isFoo).to.equal(true);
                expect(loaded.helper.isMain1Helper).to.equal(true);
                done();
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
        check(window, done) {
            expect(window.fooLoaded).to.equal(undefined);
            expect(window.main.filename).to.contain('main');

            window.main.load(function(err, loaded) {
                if (err) {
                    return done(err);
                }
                expect(window.fooLoaded).to.equal(true);
                expect(loaded.foo.isFoo).to.equal(true);
                expect(loaded.helper.isMain2Helper).to.equal(true);
                done();
            });
        }
    }
];