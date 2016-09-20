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
            'require: ./something.foo'
        ]
    };
};

exports.check = function(lassoPageResult, writerTracker) {
    var jsCode = writerTracker.getCodeForPath(lassoPageResult.getJavaScriptFiles()[0]);
    expect(jsCode).to.contain('module.exports="FOO"');
};