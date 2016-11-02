var expect = require('chai').expect;

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            'require-run: ./main'
        ]
    };
};

exports.check = function(window, done) {
    expect(window.fooLoaded).to.equal(true);
    expect(window.main.filename).to.contain('main');

    window.main.loadFoo(function(err, foo) {
        if (err) {
            return done(err);
        }

        expect(foo.isFoo).to.equal(true);
        done();
    });
};