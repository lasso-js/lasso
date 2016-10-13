var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundlingEnabled: false
    };
};

exports.getLassoOptions = function() {
    return {
        dependencies: [
            {
                type: 'js',
                code: 'abc123',
                virtualPath: path.join(__dirname, 'virtual/foo.js')
            }
        ]
    };
};

exports.check = function(lassoPageResult, writerTracker) {
    expect(lassoPageResult.getJavaScriptUrls()[0]).to.contain('/virtual/foo.js');
    
    var fooCode = writerTracker.getCodeForFilename(writerTracker.getOutputFilenames()[0]);
    expect(fooCode).to.contain('abc123');
};