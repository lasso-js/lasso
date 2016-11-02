var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false
    };
};

exports.getInputs = function() {
    return [
        {
            lassoOptions: {
                dependencies: [
                    path.join(__dirname, 'browser.json')
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'bundling-async-package-async.js',
                    'bundling-async-package.js'
                ]);

                expect(writerTracker.getCodeForFilename('bundling-async-package.js')).to.contain("console.log('foo')");
                expect(writerTracker.getCodeForFilename('bundling-async-package-async.js')).to.contain("console.log('foo-async')");
                expect(writerTracker.getCodeForFilename('bundling-async-package-async.js')).to.contain("console.log('foo-something-else')");
            }
        }
    ];
};