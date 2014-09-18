var fs = require('fs');

module.exports = exports = function(optimizer, config) {
    optimizer.dependencies.registerRequireExtension(
        'foo',
        {
            read: function(path, optimizerContext, callback) {
                fs.readFile(path, {encoding: 'utf8'}, function(err, src) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, src.toUpperCase());
                });
            },

            lastModified: function(path, optimizerContext, callback) {
                optimizerContext.getFileLastModified(path, callback);
            }
        });
};

module.exports.counter = 0;
