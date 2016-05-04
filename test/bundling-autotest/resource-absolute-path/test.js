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
                    path.join(__dirname, 'foo.js')
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                        'bundling-resource-absolute-path.js'
                    ]);

                expect(writerTracker.getCodeForFilename('bundling-resource-absolute-path.js')).to.equal("console.log('MAIN');\n");

            }
        }
    ];
};