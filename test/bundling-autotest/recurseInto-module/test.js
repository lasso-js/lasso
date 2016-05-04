var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundles: [
            {
                name: 'foo',
                dependencies: [
                    // Specified for a single dependency:
                    { path: 'require: foo', recurseInto: 'module' }
                ]
            }
        ]
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
    var fooCode = writerTracker.getCodeForFilename('foo.js');
    expect(fooCode).to.not.contain('[MAIN]');
    expect(fooCode).to.contain('[FOO]');
    expect(fooCode).to.contain('[FOO_INDEX]');
    expect(fooCode).to.not.contain('[BAR]');
    expect(fooCode).to.not.contain('[BAZ]');
};