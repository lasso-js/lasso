const CleanCSS = require('clean-css');

function isInline(lassoContext) {
    if (lassoContext.inline === true) {
        return true;
    }

    if (lassoContext.dependency && lassoContext.dependency.inline === true) {
        return true;
    }

    return false;
}

module.exports = function (lasso, pluginConfig) {
    lasso.addTransform({
        contentType: 'css',
        name: module.id,
        stream: false,

        transform (code, lassoContext) {
            if (pluginConfig.inlineOnly === true && !isInline(lassoContext)) {
                // Skip minification when we are not minifying inline code
                return code;
            }

            // Imports should not be loaded in. This was the same behavior as
            // sqwish.
            pluginConfig.processImport = false;
            return new CleanCSS(pluginConfig).minify(code).styles;
        }
    });
};
