const promisify = require('pify');
const fs = require('fs');

const readFileAsync = promisify(fs.readFile);

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

            async read (lassoContext) {
                module.exports.jsCounter++;
                const src = await readFileAsync(this.path, {encoding: 'utf8'});
                return src.toUpperCase();
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

            async read (lassoContext) {
                module.exports.cssCounter++;
                let src = await readFileAsync(this.path, {encoding: 'utf8'});
                src = src.split('').reverse().join('');
                return src;
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
