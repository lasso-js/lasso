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
                        'bundling-inline-defer-script.js'
                    ]);

                    var body = lassoPageResult.getSlotHtml('body', {
                        externalScriptAttrs: {
                            defer: true
                        }
                    });

                    expect(body).to.equal(
                        '<script src="/static/bundling-inline-defer-script.js" defer></script>\n' +
                        '<script>(function() { var run = function() { var a; }; if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", run); } else { run(); } })();</script>');
            }
        }
    ];
};