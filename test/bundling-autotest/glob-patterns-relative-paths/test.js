var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false
    };
};

exports.getInputs = function() {
    return [
        {
            lassoOptions: {
                dependencies: [
                    path.join(__dirname, 'browser.json')
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getOutputFilenames()).to.deep.equal([
                        'bundling-glob-patterns-relative-paths.css',
                        'bundling-glob-patterns-relative-paths.js'
                    ]);

                    var jsFile = lassoPageResult.getJavaScriptFiles()[0];
                    var cssFile = lassoPageResult.getCSSFiles()[0];

                    expect(writerTracker.getCodeForPath(cssFile)).to.equal(".style1 {}\n.style2 {}");
                    expect(writerTracker.getCodeForPath(jsFile)).to.contain("FOO");
                    expect(writerTracker.getCodeForPath(jsFile)).to.contain("BAR");
                    expect(writerTracker.getCodeForPath(jsFile)).to.contain("$_mod.def");

            }
        }
    ];
};