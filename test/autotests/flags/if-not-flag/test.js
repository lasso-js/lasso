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
            {'type': 'js', 'path': './a.js', 'if-flag': 'a'},
            {'type': 'js', 'path': './b.js', 'if-not-flag': 'a'}
        ]
    };
};

exports.check = function(lassoPageResult, writerTracker) {
    expect(writerTracker.getOutputFilenames()).to.deep.equal([
        // a.js only included if "a" flag is enabled
        'a.js',

        /* NOTE: b.js should not be included because it will only be included if "a" flag is not enabled */
        // 'b.js'
    ]);

    expect(writerTracker.getCodeForFilename('a.js')).to.equal('a=true;');
    expect(writerTracker.getCodeForFilename('b.js')).to.equal(undefined);
};