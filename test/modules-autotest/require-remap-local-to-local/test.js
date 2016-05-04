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
    expect(window.main.foo.filename).to.contain('foo-browser');
    expect(window.main.foo.FOO_BROWSER).to.equal(true);
};