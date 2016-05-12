module.exports = exports = function(lasso, config) {
    lasso.dependencies.registerRequireType(
        'foo',
        {
            properties: {
                'path': 'string'
            },

            init: function(lassoContext, callback) {
                if (!this.path) {
                    return callback(new Error('"path" is required for a Marko dependency'));
                }

                this.path = this.resolvePath(this.path);
                callback();
            },

            object: true, // We are exporting a simple JavaScript object

            read: function(lassoContext, callback) {
                setTimeout(function() {
                    callback(null, JSON.stringify({foo: 'bar'}));
                });
            },

            getLastModified: function(lassoContext, callback) {
                lassoContext.getFileLastModified(this.path, callback);
            }
        });
};