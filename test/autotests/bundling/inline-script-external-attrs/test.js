var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundlingEnabled: true
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
                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                    'bundling-inline-script-external-attrs.js'
                ]);

                var body = lassoPageResult.getSlotHtml('body', {
                    externalScriptAttrs: {
                        x: 1
                    }
                });

                expect(body).to.equal(
                    '<script src="/static/bundling-inline-script-external-attrs.js" x=1></script>\n' +
                    '<script>var a;</script>'
                );
            }
        }
    ];
};