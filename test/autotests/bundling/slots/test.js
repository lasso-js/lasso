var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        includeSlotNames: true
    };
};

exports.getInputs = function() {
    return [
        {
            lassoOptions: {
                dependencies: [
                    path.join(__dirname, 'foo.js'),
                    path.join(__dirname, 'foo.css')
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                        'bundling-slots-body.js',
                        'bundling-slots-head.css'
                    ]);

                expect(writerTracker.getCodeForFilename('bundling-slots-head.css')).to.equal('foo_css');
                expect(writerTracker.getCodeForFilename('bundling-slots-body.js')).to.equal('foo_js');
            }
        }
    ];
};