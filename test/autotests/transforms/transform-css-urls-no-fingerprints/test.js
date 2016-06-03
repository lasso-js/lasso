var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
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
    expect(cssCode).to.contain('url-relative:url(\'transforms-transform-css-urls-no-fingerprints/autotest$0.0.0/ebay.png\')');
    expect(cssCode).to.contain('url-dot-relative:url(\'transforms-transform-css-urls-no-fingerprints/autotest$0.0.0/ebay.png\')');
    expect(cssCode).to.contain('installed:url(\'transforms-transform-css-urls-no-fingerprints/installed$1.0.0/ebay.png\')');
    expect(cssCode).to.contain('installed-require-prefix:url(\'transforms-transform-css-urls-no-fingerprints/installed$1.0.0/ebay.png\')');
    expect(cssCode).to.contain('installed-require-prefix:url(\'http://foo.void/ebay.png\')');
    expect(cssCode).to.contain('absolute:url(\'transforms-transform-css-urls-no-fingerprints/autotest$0.0.0/ebay.png\')');
};