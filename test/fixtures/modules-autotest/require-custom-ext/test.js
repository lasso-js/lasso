var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        bundlingEnabled: false,
        fingerprintsEnabled: false,
        plugins: [
            require('./require-foo-plugin')
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



exports.check = function(window) {
    expect(window.main.filename).to.contain('main');
    expect(window.main.foo.filename).to.contain('foo');
    expect(window.main.foo.BAR).to.equal(true);
};