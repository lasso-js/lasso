var expect = require('chai').expect;

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundles: [
            {
                name: 'foo',
                dependencies: [
                    'require: ./foo'
                ]
            },
            {
                name: 'bar',
                dependencies: [
                    'require: ./bar'
                ]
            }
        ]
    };
};

exports.getInputs = function() {
    return [
        {
            lassoOptions: {
                dependencies: [
                    'require: ./main'
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'bar.js',
                    'bundling-async-package.js',
                    'foo.js'
                ]);

                expect(writerTracker.getCodeForFilename('bar.js')).to.contain("console.log('bar')");
                expect(writerTracker.getCodeForFilename('bundling-async-package.js')).to.contain(".async('bar', callback)");
                expect(writerTracker.getCodeForFilename('bundling-async-package.js')).to.contain("console.log('main')");
                expect(writerTracker.getCodeForFilename('foo.js')).to.contain("console.log('foo')");
            }
        }
    ];
};