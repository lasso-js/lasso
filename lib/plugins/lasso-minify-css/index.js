var sqwish = require('sqwish');

function minify(src, options) {
    if (!options) {
        options = {};
    }

    return sqwish.minify(src, false);
}

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

        transform: function(code, lassoContext) {
            if (pluginConfig.inlineOnly === true && !isInline(lassoContext)) {
                // Skip minification when we are not minifying inline code
                return code;
            }

            var dependency = lassoContext.dependency;
            var mergeDuplicates = dependency ? dependency.mergeDuplicates !== false : true;

            var minified = minify(code, {
                mergeDuplicates: mergeDuplicates
            });

            return minified;
        }
    });
};
