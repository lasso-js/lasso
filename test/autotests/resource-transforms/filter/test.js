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
                    async filter (lassoContext) {
                        var path = lassoContext.path;
                        if (!path) return false;
                        return /\.bar$/.test(path);
                    },

                    name: 'testTransformer',

                    stream: true,

                    transform: function(stream, contentType, lassoContext, callback) {
                        var through = require('through');
                        return stream.pipe(through(
                            function write(chunk) {
                                this.push(chunk);
                            },
                            function end(chunk) {
                                this.push(new Buffer('-TRANSFORMED', 'utf8'));
                                this.push(null);
                            }
                        ));
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
                expect(fs.readFileSync(outputFile, {encoding: 'utf8'})).to.equal('hello-TRANSFORMED');
            }
        },
        {
            path: nodePath.join(__dirname, 'transform.foo'),
            options: {},
            check(result) {
                var outputFile = result.outputFile;
                expect(fs.readFileSync(outputFile, {encoding: 'utf8'})).to.equal('world');
            }
        },

    ];
};
