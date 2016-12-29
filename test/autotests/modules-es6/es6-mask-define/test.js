var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false
    };
};

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            { path: './simple.es6', 'mask-define': true }
        ]
    };
};

exports.check = function(window) {
    expect(window.foo).to.be.a('function');
    expect(window.foo.toString()).to.not.contain('const');
};