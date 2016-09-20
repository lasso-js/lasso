var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: false,
        bundlingEnabled: true,
        plugins: [
            function(lasso, pluginConfig) {
                lasso.dependencies.registerRequireExtension(
                    'dynamic',
                    {
                        read: function(filename, lassoContext) {
                            var target = lassoContext.data.target;
                            return 'module.exports = require("./' + target + '")';
                        }
                    });
            }
        ]
    };
};

exports.getInputs = function() {
    return [
        {
            lassoOptions: {
                flags: ['hello'],
                data: {
                    target: 'hello'
                },
                dependencies: [
                    `require: ${path.join(__dirname, 'hello.dynamic')}`
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getOutputFilenames().length).to.equal(1);
                expect(writerTracker.getCodeForFilename(writerTracker.getOutputFilenames()[0])).to.contain('$$HELLO$$');
                expect(writerTracker.getCodeForFilename(writerTracker.getOutputFilenames()[0])).to.not.contain('$$FOO$$');
            }
        },
        {
            lassoOptions: {
                flags: ['foo'],
                data: {
                    target: 'foo'
                },
                dependencies: [
                    `require: ${path.join(__dirname, 'hello.dynamic')}`
                ]
            },
            check(lassoPageResult, writerTracker) {
                expect(writerTracker.getOutputFilenames().length).to.equal(1);
                expect(writerTracker.getCodeForFilename(writerTracker.getOutputFilenames()[0])).to.contain('$$FOO$$');
                expect(writerTracker.getCodeForFilename(writerTracker.getOutputFilenames()[0])).to.not.contain('$$HELLO$$');
            }
        }
    ];
};