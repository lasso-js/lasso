var expect = require('chai').expect;

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            'require-run: ./main'
        ]
    };
};

exports.check = function(window) {
    expect(window.main.filename).to.contain('main');
    expect(window.main.simple.filename).to.contain('simple');
    expect(typeof window.main.simple.Foo).to.equal('function');
    expect(window.main.simple.foo).to.equal(123);
};