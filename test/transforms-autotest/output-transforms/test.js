var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundlingEnabled: true,
        plugins: [
            {
                plugin: function(theLasso, config) {
                    theLasso.addTransform(require('./css-transform1.js'));
                    theLasso.addTransform(require('./css-transform2.js'));
                    theLasso.addTransform(require('./js-transform1-async.js'));
                    theLasso.addTransform(require('./js-transform2-async.js'));
                }
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
    expect(writerTracker.getOutputFilenames()).to.deep.equal( [
        'transforms-output-transforms.css',
        'transforms-output-transforms.js'
    ] );
    expect(writerTracker.getCodeForFilename('transforms-output-transforms.js')).to.equal('transformsA_js-JavaScriptTransform1Async-JavaScriptTransform2Async');
    expect(writerTracker.getCodeForFilename('transforms-output-transforms.css')).to.equal('TRANSFORMSA_CSS-CSSTRANSFORM1-CSSTransform2');
};