var expect = require('chai').expect;

exports.getLassoConfig = function(dir) {
    return {
        bundlingEnabled: false,
        fingerprintsEnabled: false,
        noConflict: 'myapp'
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
    expect(window.main.foo.filename).to.contain('foo');
    expect(window.main.foo.FOO).to.equal(true);
    expect(window.$_mod).to.equal(undefined);
    expect(typeof window.$_mod_myapp).to.equal('object');
};