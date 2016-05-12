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

exports.check = function(lassoPageResult, writerTracker, helpers) {
    var myInlineSlotHtml = lassoPageResult.getSlotHtml('my-inline-slot');
    helpers.compare(myInlineSlotHtml, '-my-inline-slot.html');

    var jsCode = writerTracker.getCodeForPath(lassoPageResult.getJavaScriptFiles()[0]);
    expect(jsCode).to.equal("console.log('baz');");
};