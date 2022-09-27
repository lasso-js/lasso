const fs = require('fs');

module.exports = exports = function(lasso, config) {
    lasso.dependencies.registerRequireExtension(
        'foo',
        {
            async read (path, lassoContext) {
                let src = await fs.promises.readFile(path, 'utf8');
                src = src.replace(/FOO/g, 'BAR');
                return src;
            },

            async lastModified (path, lassoContext) {
                return lassoContext.getFileLastModified(path);
            }
        });
};

module.exports.counter = 0;
