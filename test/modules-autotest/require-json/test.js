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
    expect(window.main.foo1.FOO).to.equal(true);
    expect(window.main.foo2.FOO).to.equal(true);
};