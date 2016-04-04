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
    expect(window.main.foo.filename).to.contain('foo-installed');
    expect(window.main.foo.FOO_INSTALLED).to.equal(true);
};