var expect = require('chai').expect;
require('require-self-ref');

exports.getLassoOptions = function(dir) {
    return {
        dependencies: [
            require.resolve('./browser.json')
        ]
    };
};

exports.check = function(window) {
    expect(window.nested).to.equal(true);
};