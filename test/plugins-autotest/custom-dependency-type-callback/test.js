var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundlingEnabled: true,
        plugins: [
            require('./plugin')
        ]
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
    var plugin = require('./plugin');

    var jsCode = writerTracker.getCodeForPath(lassoPageResult.getJavaScriptFiles()[0]);
    expect(jsCode).to.equal('HELLO WORLD');

    var cssCode = writerTracker.getCodeForPath(lassoPageResult.getCSSFiles()[0]);
    expect(cssCode).to.equal('dlrow olleh');

    expect(plugin.cssCounter).to.equal(1);
    expect(plugin.jsCounter).to.equal(1);
};