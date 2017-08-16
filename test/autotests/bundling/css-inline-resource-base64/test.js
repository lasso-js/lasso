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
                    path.join(__dirname, 'foo.css')
                ]
            },
            check(lassoPageResult, writerTracker, helpers) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'bundling-css-inline-resource-base64-head.css'
                ]);

                var actualCSS = writerTracker.getCodeForFilename('bundling-css-inline-resource-base64-head.css');
                helpers.compare(actualCSS, '.css');
            }
        }
    ];
};
