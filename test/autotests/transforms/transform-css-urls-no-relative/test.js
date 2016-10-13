var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: true,
        bundlingEnabled: true,
        urlPrefix: 'https://cdn.example.net/build',
        relativeUrlsEnabled: false
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
    expect(cssCode).to.contain('url-relative:url(\'https://cdn.example.net/build/ebay-1cace448.png\')');
    expect(cssCode).to.contain('installed:url(\'https://cdn.example.net/build/ebay-1cace448.png\')');
    expect(cssCode).to.contain('installed-require-prefix:url(\'https://cdn.example.net/build/ebay-1cace448.png\')');
    expect(cssCode).to.contain('installed-require-prefix:url(\'http://foo.void/ebay.png\')');
    expect(cssCode).to.contain('absolute:url(\'https://cdn.example.net/build/ebay-1cace448.png\')');
};
