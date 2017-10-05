var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundles: []
    };
};

exports.getLassoOptions = function() {
    return {
        dependencies: [
            {
                type: 'require',
                path: require.resolve('../../../../taglib/helper-getImageInfo')
            }
        ]
    };
};

exports.check = function(lassoPageResult, writerTracker) {
    var fooCode = writerTracker.getCodeForFilename(writerTracker.getOutputFilenames()[0]);
    expect(fooCode).to.contain('lassoImage.getImageInfo');
};
