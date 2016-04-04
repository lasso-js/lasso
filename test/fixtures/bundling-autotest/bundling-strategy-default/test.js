var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundles: [
            {
                name: 'everything',
                dependencies: [
                    'a.js',
                    'b.js',
                    'c.js'
                ]
            }
        ]
    };
};

exports.getLassoOptions = function() {
    return {
        dependencies: [
            './a.js'
        ]
    };
};

exports.check = function(lassoPageResult, writerTracker) {
    var fooCode = writerTracker.getCodeForFilename('everything.js');
    expect(fooCode).to.equal('a\n\nb\n\nc\n');
};