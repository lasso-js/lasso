var expect = require('chai').expect;

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

    window.main.loadFoo(function(err) {
        if (err) {
            return done(err);
        }

        done();
    });
};