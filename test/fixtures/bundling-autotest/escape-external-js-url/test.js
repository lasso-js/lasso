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
                        type: 'js',
                        url: 'https://maps.googleapis.com/maps/api/js?key=KEY&callback=CB'
                    }
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(lassoPageResult.getBodyHtml()).to.equal('<script src="https://maps.googleapis.com/maps/api/js?key=KEY&amp;callback=CB"></script>');
                expect(lassoPageResult.getHeadHtml()).to.equal('');
            }
        }
    ];
};