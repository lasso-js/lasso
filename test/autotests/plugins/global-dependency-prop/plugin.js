module.exports = exports = function(lasso, config) {
    lasso.dependencies.registerRequireExtension(
                'foo',
                {
                    read: function(filename, lassoContext) {
                        return 'module.exports="FOO"';
                    }
                });
};