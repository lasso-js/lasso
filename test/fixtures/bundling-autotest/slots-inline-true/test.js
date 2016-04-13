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
                        path: path.join(__dirname, 'a.js'),
                        inline: true
                    },
                    path.join(__dirname, 'b.js')
                ]
            },
            check(lassoPageResult, writerTracker) {

                expect(writerTracker.getOutputFilenames()).to.deep.equal(['bundling-slots-inline-true-body.js']);

                var body = lassoPageResult.getSlotHtml('body');

                expect(body).to.equal('<script src="/static/bundling-slots-inline-true-body.js"></script>\n<script>a</script>');
            }
        }
    ];
};