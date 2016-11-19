var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundles: [
            {
                name: 'common',
                dependencies: [
                    {
                        intersection: [
                            'require: ./a',
                            'require: ./b'
                        ]
                    }
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
                    path.join(__dirname, 'main.browser.json')
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'bundling-intersection-threshold-2-require.js',
                    'common.js'
                ]);

                expect(writerTracker.getCodeForFilename('common.js')).to.contain('THIS_IS_SHARED');
                expect(writerTracker.getCodeForFilename('bundling-intersection-threshold-2-require.js')).to.contain('THIS_IS_A');
                expect(writerTracker.getCodeForFilename('bundling-intersection-threshold-2-require.js')).to.contain('THIS_IS_B');
            }
        }
    ];
};