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
                        inline: 'beginning'
                    },
                    path.join(__dirname, 'b.js')
                ]
            },
            check(lassoPageResult, writerTracker) {

                expect(writerTracker.getOutputFilenames()).to.deep.equal(['bundling-slots-inline-beginning-body.js']);

                var body = lassoPageResult.getSlotHtml('body');

                expect(body).to.equal('<script>a</script>\n<script src="/static/bundling-slots-inline-beginning-body.js"></script>');
            }
        }
    ];
};