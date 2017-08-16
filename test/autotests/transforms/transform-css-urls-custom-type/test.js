var expect = require('chai').expect;
var path = require('path');

exports.getLassoConfig = function() {
    return {
        fingerprintsEnabled: true,
        urlPrefix: '/static',
        bundlingEnabled: true,
        plugins: [
            {
                plugin: function(theLasso) {
                    theLasso.dependencies.registerStyleSheetType('foo', {
                        properties: {
                            'path': 'string'
                        },

                        async init (lassoContext) {
                            this.path = this.resolvePath(this.path);
                        },

                        read: function(lassoContext, callback) {
                            var path = this.path;

                            require('fs').readFile(path, {encoding: 'utf8'}, function(err, css) {
                                if (err) {
                                    return callback(err);
                                }

                                callback(null, css);
                            });
                        },

                        getSourceFile: function() {
                            return this.path;
                        },

                        async getLastModified (lassoContext) {
                            return -1;
                        }
                    });
                }
            }
        ]
    };
};

exports.getLassoOptions = function() {
    return {
        dependencies: [
            {
                type: 'foo',
                path: path.join(__dirname, 'foo.css')
            }
        ]
    };
};

exports.check = function(lassoPageResult, writerTracker) {
    var expected = '.foo {background-image: url(\'ebay-logo-d481eb85.png\');}';
    var actual = writerTracker.getCodeForPath(lassoPageResult.getCSSFiles()[0]);
    // console.log(actual);
    expect(actual).to.equal(expected);
};
