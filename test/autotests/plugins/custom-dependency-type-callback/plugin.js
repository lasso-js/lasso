var fs = require('fs');

module.exports = exports = function(lasso, config) {
    lasso.dependencies.registerJavaScriptType(
        'foo-js',
        {
            properties: {
                'path': 'string'
            },

            async init () {
                if (!this.path) {
                    throw new Error('"path" is required for a less dependency');
                }

                this.path = this.resolvePath(this.path);
            },

            read: function(lassoContext, callback) {
                // console.log(module.id, 'READ: ', this.path);
                module.exports.jsCounter++;

                var path = this.path;

                fs.readFile(path, {encoding: 'utf8'}, function(err, src) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, src.toUpperCase());
                });
            },

            getSourceFile: function() {
                return this.path;
            },

            async lastModified (lassoContext) {
                return -1;
            }
        });

    lasso.dependencies.registerStyleSheetType(
        'foo-css',
        {
            properties: {
                'path': 'string'
            },

            async init () {
                if (!this.path) {
                    throw new Error('"path" is required for a less dependency');
                }

                this.path = this.resolvePath(this.path);
            },

            read: function(lassoContext, callback) {
                // console.log(module.id, 'READ: ', this.path);
                module.exports.cssCounter++;

                var path = this.path;

                fs.readFile(path, {encoding: 'utf8'}, function(err, src) {
                    if (err) {
                        return callback(err);
                    }

                    src = src.split('').reverse().join('');

                    callback(null, src);
                });
            },

            getSourceFile: function() {
                return this.path;
            },

            async lastModified (lassoContext) {
                return -1;
            }
        });
};

module.exports.jsCounter = 0;
module.exports.cssCounter = 0;
