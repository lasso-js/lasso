var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundlingEnabled: false,
        plugins: [
            {
                plugin: function(lasso, config) {
                    lasso.dependencies.registerJavaScriptType('foo', {
                        properties: {
                        },

                        async init (lassoContext) {},

                        read: function(lassoContext, callback) {
                            callback(null, 'FOO');
                        }
                    });
                }
            }
        ]
    };
};

exports.getInputs = function() {
    return [
        {
            lassoOptions: {
                dependencies: [
                    {type: 'foo'}
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                        'foo-bundling-custom-dependency-type-no-bundling.js'
                    ]);

                    var jsFile = lassoPageResult.getJavaScriptFiles()[0];
                    expect(writerTracker.getCodeForPath(jsFile)).to.equal("FOO");

            }
        }
    ];
};
