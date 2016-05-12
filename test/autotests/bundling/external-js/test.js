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
                    'js: http://code.jquery.com/jquery-1.11.0.min.js'
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(lassoPageResult.getBodyHtml()).to.equal('<script src="http://code.jquery.com/jquery-1.11.0.min.js"></script>');
                expect(lassoPageResult.getHeadHtml()).to.equal('');
            }
        }
    ];
};