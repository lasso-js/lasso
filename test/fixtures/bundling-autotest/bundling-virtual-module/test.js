var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundlingEnabled: true
    };
};

exports.getLassoOptions = function() {
    return {
        dependencies: [
            {
                type: 'require',
                virtualModule: {
                    path: __dirname + '/x/y/z',
                    clientPath: '/x/y/z',
                    read: function(lassoContext, callback) {
                        callback(null, 'abc');
                    },
                    getDefaultBundleName: function(pageBundleName, lassoContext) {
                        return 'xyz';
                    }
                }
            }
        ]
    };
};

exports.check = function(lassoPageResult, writerTracker) {
    var everythingCode = writerTracker.getCodeForFilename('xyz.js');
    expect(everythingCode).to.contain('abc');
};