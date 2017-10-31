var expect = require('chai').expect;
const plugin = require('./plugin');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundlingEnabled: true,
        plugins: [plugin]
    };
};

exports.getLassoOptions = function() {
    return {
        dependencies: [
            './browser.json'
        ]
    };
};

exports.check = function(lassoPageResult, writerTracker) {
    expect(plugin.counter).to.deep.equal(['init', 'writeBundle']);
    expect(lassoPageResult.getJavaScriptFiles().length).to.equal(0);
    expect(lassoPageResult.getJavaScriptUrls()).to.deep.equal(['test.com']);
};
