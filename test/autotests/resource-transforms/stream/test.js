var expect = require('chai').expect;
var nodePath = require('path');
var fs = require('fs');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: true,
        bundlingEnabled: true,
        plugins: [
            function myPlugin(myLasso, pluginConfig) {
                myLasso.addTransform({
                    contentType: ['foo', 'bar'],

                    name: 'testTransformer',

                    stream: true,

                    transform: function(stream, lassoContext, callback) {
                        var contentType = lassoContext.contentType;

                        var deferredStream = lassoContext.deferredStream(function() {
                            var chunks = [];
                            stream
                                .on('data', function(chunk) {
                                    chunks.push(chunk);
                                })
                                .on('error', function(err) {
                                    return callback(err);
                                })
                                .on('end', function() {
                                    var buffer = Buffer.concat(chunks); // Create a buffer from all the received chunks
                                    var str = buffer.toString('utf8');

                                    // results[lassoContext.path] = str;

                                    if (contentType === 'foo') {
                                        deferredStream.push(str + '-FOO');
                                    } else if (contentType === 'bar') {
                                        deferredStream.push(str + '-BAR');
                                    } else {
                                        throw new Error('Unexpected content type: ', contentType);
                                    }

                                    deferredStream.push(null);
                                });
                        });

                        return deferredStream;
                    }
                });
            }
        ]
    };
};

exports.getLassoOptions = function() {
    return {};
};

exports.getInputs = function() {
    return [
        {
            path: nodePath.join(__dirname, 'transform.bar'),
            options: {},
            check(result) {
                var outputFile = result.outputFile;
                expect(fs.readFileSync(outputFile, {encoding: 'utf8'})).to.equal('hello-BAR');
            }
        },
        {
            path: nodePath.join(__dirname, 'transform.foo'),
            options: {},
            check(result) {
                var outputFile = result.outputFile;
                expect(fs.readFileSync(outputFile, {encoding: 'utf8'})).to.equal('world-FOO');
            }
        },

    ];
};
