var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        flags: ['mobile'],
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
    expect(writerTracker.getOutputFilenames()).to.deep.equal([
        // a.js only included if "a" flag is enabled
        //'a.js',

        /* NOTE: b.js should not be included because it requires flag "b" */
        // 'a.js'

        // c.js is always included (not conditional)
        'c.js',
        'mobile-a.js',
        'mobile-b.js'
    ]);

    expect(writerTracker.getCodeForFilename('c.js')).to.equal('c=true;');
    expect(writerTracker.getCodeForFilename('mobile-a.js')).to.equal('mobile_a');
    expect(writerTracker.getCodeForFilename('mobile-b.js')).to.equal('mobile_b');
};