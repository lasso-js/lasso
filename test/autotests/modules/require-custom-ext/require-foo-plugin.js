const { promisify } = require('util');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);

module.exports = exports = function(lasso, config) {
    lasso.dependencies.registerRequireExtension(
        'foo',
        {
            async read (path, lassoContext) {
                let src = await readFileAsync(path, {encoding: 'utf8'});
                src = src.replace(/FOO/g, 'BAR');
                return src;
            },

            async lastModified (path, lassoContext) {
                return lassoContext.getFileLastModified(path);
            }
        });
};

module.exports.counter = 0;
