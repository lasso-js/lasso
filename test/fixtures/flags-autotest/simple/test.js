var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        flags: ['a'],
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
        'a.js',

        /* NOTE: b.js should not be included because it requires flag "b" */
        // 'a.js'

        // c.js is always included (not conditional)
        'c.js',
        'desktop-a.js',
        'desktop-b.js'
    ]);

    expect(writerTracker.getCodeForFilename('a.js')).to.equal('a=true;');
    expect(writerTracker.getCodeForFilename('c.js')).to.equal('c=true;');
    expect(writerTracker.getCodeForFilename('desktop-a.js')).to.equal('desktop_a');
    expect(writerTracker.getCodeForFilename('desktop-b.js')).to.equal('desktop_b');
};