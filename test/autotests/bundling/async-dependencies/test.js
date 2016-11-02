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
                    'bundling-async-dependencies-async.js',
                    'bundling-async-dependencies.js'
                ]);

                expect(writerTracker.getCodeForFilename('bundling-async-dependencies.js')).to.contain("console.log('foo')");
                expect(writerTracker.getCodeForFilename('bundling-async-dependencies.js')).to.contain('.async("_0"');


                expect(writerTracker.getCodeForFilename('bundling-async-dependencies-async.js')).to.contain("a.js");
                expect(writerTracker.getCodeForFilename('bundling-async-dependencies-async.js')).to.contain("b.js");
                expect(writerTracker.getCodeForFilename('bundling-async-dependencies-async.js')).to.contain("console.log('foo-async')");
                expect(writerTracker.getCodeForFilename('bundling-async-dependencies-async.js')).to.contain("console.log('foo-something-else')");
            }
        }
    ];
};