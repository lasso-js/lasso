var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundles: [
            {
                name: 'bundle1',
                dependencies: [
                    path.join(__dirname, 'a.js'),
                    path.join(__dirname, 'b.js')
                ]
            },
            {
                name: 'bundle2',
                dependencies: [
                    path.join(__dirname, 'b.js'),
                    path.join(__dirname, 'c.js')
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
                    path.join(__dirname, 'a.js'),
                    path.join(__dirname, 'b.js'),
                    path.join(__dirname, 'c.js'),
                    path.join(__dirname, 'd.js')
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                        'bundle1.js',
                        'bundle2.js',
                        'bundling-dedupe.js',
                    ]);

                expect(writerTracker.getCodeForFilename('bundle1.js')).to.equal('a\nb');
                expect(writerTracker.getCodeForFilename('bundle2.js')).to.equal('c');
                expect(writerTracker.getCodeForFilename('bundling-dedupe.js')).to.equal('d');

            }
        }
    ];
};