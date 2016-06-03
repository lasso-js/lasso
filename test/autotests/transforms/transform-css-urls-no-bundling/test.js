var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundlingEnabled: false
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
    expect(cssCode).to.contain('url-relative:url(\'ebay.png\')');
    expect(cssCode).to.contain('url-dot-relative:url(\'ebay.png\')');
    expect(cssCode).to.contain('installed:url(\'../installed$1.0.0/ebay.png\')');
    expect(cssCode).to.contain('installed-require-prefix:url(\'../installed$1.0.0/ebay.png\')');
    expect(cssCode).to.contain('installed-require-prefix:url(\'http://foo.void/ebay.png\')');
    expect(cssCode).to.contain('absolute:url(\'ebay.png\')');
};