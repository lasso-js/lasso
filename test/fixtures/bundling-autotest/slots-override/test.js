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
                        path: path.join(__dirname, 'foo.js'),
                        slot: 'head'
                    },
                    {
                        path: path.join(__dirname, 'foo.css'),
                        slot: 'body'
                    }

                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                        'bundling-slots-override-body.css',
                        'bundling-slots-override-head.js'
                    ]);

                expect(writerTracker.getCodeForFilename('bundling-slots-override-body.css')).to.equal('foo_css');
                expect(writerTracker.getCodeForFilename('bundling-slots-override-head.js')).to.equal('foo_js');

                expect(lassoPageResult.getHeadHtml()).to.contain('bundling-slots-override-head.js');
                expect(lassoPageResult.getBodyHtml()).to.contain('bundling-slots-override-body.css');
            }
        }
    ];
};