var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        flags: ['a'],
        bundlingEnabled: true,
        bundles: [
            {
                name: 'foo',
                dependencies: [
                    './browser.json'
                ]
            }
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
    var firstFile = lassoPageResult.getJavaScriptFiles()[0];
    expect(writerTracker.getCodeForPath(firstFile)).to.equal('a=true;\nc=true;');
};