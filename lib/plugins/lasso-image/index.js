var parallel = require('raptor-async/parallel');
var imageSize = require('image-size');
var nodePath = require('path');

var IMAGE_SIZE_WHITELIST = {
    '.png': true,
    '.jpeg': true,
    '.jpg': true,
    '.gif': true,
    '.webp': true
};

var plugin = function(lasso, config) {
    var handler = {
        properties: {
            'path': 'string'
        },

        async init (lassoContext) {
            if (!this.path) {
                throw new Error('"path" is required for a Marko dependency');
            }

            this.path = this.resolvePath(this.path);
        },

        object: true, // We are exporting a simple JavaScript object

        read: function(lassoContext, callback) {
            plugin.getImageInfo(this.path, { lasso }, function(err, imageInfo) {
                if (err) {
                    return callback(err);
                }

                callback(null, JSON.stringify(imageInfo));
            });
        },

        getLastModified: function(lassoContext, callback) {
            lassoContext.getFileLastModified(this.path, callback);
        }
    };

    [
        'png',
        'jpeg',
        'jpg',
        'gif',
        'svg',
        'webp'
    ].forEach(function(ext) {
        lasso.dependencies.registerRequireType(ext, handler);
    });
};

plugin.getImageInfo = function(path, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = null;
    }

    var theLasso;
    var lassoContext;
    var renderContext;

    if (options) {
        theLasso = options.lasso;
        lassoContext = options.lassoContext;
        renderContext = options.renderContext;
    }

    if (!theLasso) {
        theLasso = (plugin.lasso || require('lasso')).defaultLasso;
    }

    if (!lassoContext) {
        lassoContext = theLasso.createLassoContext(
            renderContext ? { data: { renderContext } } : {});
    }

    // NOTE: lassoContext.getFileLastModified caches file timestamps
    lassoContext.getFileLastModified(path)
        .then((lastModified) => {
            var cache = lassoContext.cache.getCache('lasso-image');
            cache.get(
                path,
                {
                    lastModified: lastModified,
                    builder: function(callback) {
                        var imageInfo = {};
                        var work = [
                            function(callback) {
                                theLasso.lassoResource(path, lassoContext)
                                    .then((resourceInfo) => {
                                        imageInfo.url = resourceInfo.url;
                                        callback();
                                    })
                                    .catch((err) => {
                                        callback(err);
                                    });
                            }
                        ];

                        var ext = nodePath.extname(path);
                        if (IMAGE_SIZE_WHITELIST[ext]) {
                            work.push(function(callback) {
                                imageSize(path, function (err, dimensions) {
                                    if (err) {
                                        return callback(err);
                                    }

                                    imageInfo.width = dimensions.width;
                                    imageInfo.height = dimensions.height;
                                    callback();
                                });
                            });
                        }

                        parallel(work,
                            function(err) {
                                if (err) {
                                    return callback(err);
                                }

                                return callback(null, imageInfo);
                            });
                    }
                },
                callback);
        })
        .catch((err) => {
            callback(err);
        });
};

module.exports = plugin;
