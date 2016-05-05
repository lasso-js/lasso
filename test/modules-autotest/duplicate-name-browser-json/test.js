var expect = require('chai').expect;

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            require.resolve('./browser.json')
        ]
    };
};

exports.check = function(window) {
    expect(window.main.foo.hello).to.contain('foo');
    expect(window.main.bar.hello).to.contain('bar');
};