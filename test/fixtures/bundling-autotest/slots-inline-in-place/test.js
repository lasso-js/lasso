var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundlingEnabled: false
    };
};

exports.getInputs = function() {
    return [
        {
            lassoOptions: {
                dependencies: [
                    path.join(__dirname, 'a.js'),
                    {
                        path: path.join(__dirname, 'b.js'),
                        inline: 'in-place'
                    },
                    path.join(__dirname, 'c.js')
                ]
            },
            check(lassoPageResult, writerTracker) {

                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'a.js',
                    'c.js'
                ]);

                var body = lassoPageResult.getSlotHtml('body');

                expect(body).to.equal(
                    '<script src="/static/bundling-slots-inline-in-place/test-bundling-project$0.0.0/a.js"></script>\n' +
                    '<script>b</script>\n' +
                    '<script src="/static/bundling-slots-inline-in-place/test-bundling-project$0.0.0/c.js"></script>');
            }
        }
    ];
};