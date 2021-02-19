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
                    {
                        type: 'css',
                        url: 'https://fonts.googleapis.com/css?family=Open+Sans&subset=latin'
                    }
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(lassoPageResult.getBodyHtml()).to.equal('');
                expect(lassoPageResult.getHeadHtml()).to.equal('<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Open+Sans&subset=latin">');
            }
        }
    ];
};