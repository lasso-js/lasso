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
                        'bundling-csp-nonce-inline-script.js'
                    ]);

                    var body = lassoPageResult.getSlotHtml('body', {
                        inlineScriptAttrs: {
                            nonce: 'abc'
                        }
                    });

                    expect(body).to.equal(
                        '<script src="/static/bundling-csp-nonce-inline-script.js"></script>\n' +
                        '<script nonce="abc">a</script>');
            }
        }
    ];
};