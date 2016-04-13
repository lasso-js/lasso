var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: true,
        bundlingEnabled: true,
        minifyJS: true
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
    expect(jsCode).to.not.contain('hello');
    expect(jsCode).to.not.contain('name');
    expect(jsCode).to.contain('console');
};