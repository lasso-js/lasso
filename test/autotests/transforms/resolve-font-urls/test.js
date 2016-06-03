var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: true,
        bundlingEnabled: true
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
    var expected = "@font-face { src: url('Aleo-Regular-6be64eb6.woff'); }";
    var actual = writerTracker.getCodeForPath(lassoPageResult.getCSSFiles()[0]);
    // console.log(actual);
    expect(actual).to.equal(expected);
};