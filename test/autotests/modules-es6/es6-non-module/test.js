var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false
    };
};

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            './simple.es6'
        ]
    };
};

exports.check = function(window) {
    expect(window.foo).to.be.a('function');
    expect(window.foo.toString()).to.not.contain('const');
};