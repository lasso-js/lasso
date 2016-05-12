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
    expect(Object.keys(window.main.foo).length).to.equal(0);
    expect(Object.keys(window.main.foo2).length).to.equal(0);
};