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
                        threshold: 2,
                        intersection: [
                            // a.js is found in 2/3 (100%)
                            // b.js is found in 2/3 (66.6%)
                            // c.js if found in 1/3 (33.3%)
                            path.join(__dirname, 'a.browser.json'),
                            path.join(__dirname, 'ab.browser.json'),
                            path.join(__dirname, 'abc.browser.json')
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
                    path.join(__dirname, 'abc.browser.json')
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'bundling-intersection-threshold-2.js',
                    'common.js'
                ]);

                expect(writerTracker.getCodeForFilename('common.js')).to.equal('a=true;\nb=true;');
                expect(writerTracker.getCodeForFilename('bundling-intersection-threshold-2.js')).to.equal('c=true;');
            }
        }
    ];
};