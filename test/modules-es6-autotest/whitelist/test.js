var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        require: {
            babel: {
                extensions: ['.js'],
                paths: [
                    'whitelisted'
                ]
            }
        }
    };
};

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            'require-run: ./main'
        ]
    };
};

exports.check = function(window) {
    expect(window.main.filename).to.contain('main');
    expect(window.main.whitelisted.filename).to.contain('whitelisted/index');
    expect(typeof window.main.whitelisted.Foo).to.equal('function');
    expect(window.main.whitelisted.foo).to.equal(123);
};