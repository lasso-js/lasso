var expect = require('chai').expect;

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
                name: 'foo',
                dependencies: [
                    'require: ./foo'
                ]
            },
            {
                name: 'something',
                dependencies: [
                    './something.js'
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

exports.check = function(window, done) {
    expect(window.fooLoaded).to.equal(undefined);
    expect(window.main.filename).to.contain('main');

    window.main.loadFoo(function(err, foo) {
        if (err) {
            return done(err);
        }

        expect(foo.isFoo).to.equal(true);
        expect(window.fooLoaded).to.equal(true);
        expect(window.barLoaded).to.equal(undefined);
        expect(window.somethingLoaded).to.equal(undefined);

        window.main.loadBar(function(err, bar) {
            if (err) {
                return done(err);
            }

            expect(bar.isBar).to.equal(true);
            expect(window.fooLoaded).to.equal(true);
            expect(window.barLoaded).to.equal(true);
            expect(window.somethingLoaded).to.equal(undefined);

            window.main.loadSomething(function(err) {
                if (err) {
                    return done(err);
                }

                expect(window.fooLoaded).to.equal(true);
                expect(window.barLoaded).to.equal(true);
                expect(window.somethingLoaded).to.equal(true);

                done();
            });
        });
    });
};