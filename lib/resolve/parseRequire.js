module.exports = function parseRequire(path) {
    var typeSeparatorIndex = path.indexOf(':');

    // NOTE: Windows paths may have drive letter followed by colon.
    // If colon is the second character then assume it is a
    // file system path.
    if (typeSeparatorIndex !== -1 &&
            typeSeparatorIndex > 1 /* Fixes Issue: https://github.com/lasso-js/lasso/issues/65 */) {
        var type = path.substring(0, typeSeparatorIndex).trim();
        path = path.substring(typeSeparatorIndex + 1).trim();

        return {
            type: type,
            path: path
        };
    } else {
        return {
            path: path
        };
    }
};
