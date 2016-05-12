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
    var jsCode = writerTracker.getCodeForPath(lassoPageResult.getJavaScriptFiles()[0]);
    expect(jsCode).to.contain('$_mod.def("/autotest$0.0.0/something.foo", {"foo":"bar"})');
};