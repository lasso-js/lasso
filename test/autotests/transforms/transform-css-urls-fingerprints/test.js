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
    var cssCode = writerTracker.getCodeForPath(lassoPageResult.getCSSFiles()[0]);
    expect(cssCode).to.contain('url-relative:url(ebay-1cace448.png)');
    expect(cssCode).to.contain('installed:url(ebay-1cace448.png)');
    expect(cssCode).to.contain('installed-require-prefix:url(ebay-1cace448.png)');
    expect(cssCode).to.contain('installed-require-prefix:url(http://foo.void/ebay.png)');
    expect(cssCode).to.contain('absolute:url(ebay-1cace448.png)');
};