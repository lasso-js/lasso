var expect = require('chai').expect;

exports.getLassoConfig = function(dir) {
    var globals = {};
    globals[require.resolve('foo')] = 'foo';

    return {
        bundlingEnabled: false,
        fingerprintsEnabled: false,
        require: {
             globals
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
    expect(window.foo.FOO).to.equal(true);
    expect(window.main.foo.FOO).to.equal(true);
};