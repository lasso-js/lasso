var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundlingStrategy: 'lean',
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
            './a.js',
            './a.js'
        ]
    };
};

exports.check = function(lassoPageResult, writerTracker) {
    var everythingCode = writerTracker.getCodeForFilename('everything.js');
    expect(everythingCode).to.equal('a\n');
};