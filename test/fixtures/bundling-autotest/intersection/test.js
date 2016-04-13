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
                        'intersection': [
                            path.join(__dirname, 'page1.browser.json'),
                            path.join(__dirname, 'page2.browser.json')
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
                pageName: 'page1',
                dependencies: [
                    path.join(__dirname, 'page1.browser.json')
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getCodeForFilename('page1.js')).to.equal("FOO");

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                        'common.js',
                        'page1.js'
                    ]);

                expect(writerTracker.getCodeForFilename('common.js')).to.equal("COMMON");
            }
        },
        {
            lassoOptions: {
                pageName: 'page2',
                dependencies: [
                    path.join(__dirname, 'page2.browser.json')
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getCodeForFilename('page2.js')).to.equal("BAR");

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                        'common.js',
                        'page2.js'
                    ]);

                expect(writerTracker.getCodeForFilename('common.js')).to.equal("COMMON");
            }
        }
    ];
};