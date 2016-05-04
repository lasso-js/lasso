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
            'require: ./main'
        ]
    };
};

exports.check = function(lassoPageResult, writerTracker) {
    var fooCode = writerTracker.getCodeForFilename(writerTracker.getOutputFilenames()[0]);
    expect(fooCode).to.contain('[MAIN]');
    expect(fooCode).to.contain('[FOO]');
    expect(fooCode).to.contain('[FOO_INDEX]');
    expect(fooCode).to.contain('[BAR]');
    expect(fooCode).to.contain('[BAZ]');
};