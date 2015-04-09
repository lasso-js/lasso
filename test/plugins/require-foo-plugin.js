var fs = require('fs');

module.exports = exports = function(lasso, config) {
    lasso.dependencies.registerRequireExtension(
        'foo',
        {
            read: function(path, lassoContext, callback) {
                fs.readFile(path, {encoding: 'utf8'}, function(err, src) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, src.toUpperCase());
                });
            },

            lastModified: function(path, lassoContext, callback) {
                lassoContext.getFileLastModified(path, callback);
            }
        });
};

module.exports.counter = 0;
