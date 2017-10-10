var UglifyJS = require('uglify-js');

function minify(src, options) {
    options = options || {};
    options.fromString = true;

    return UglifyJS.minify(src, options).code;
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
        contentType: 'js',

        name: module.id,

        stream: false,

        transform: function(code, lassoContext) {
            if (pluginConfig.inlineOnly === true && !isInline(lassoContext)) {
                // Skip minification when we are not minifying inline code
                return code;
            }

            try {
                var minified = minify(code, pluginConfig);
                if (minified.length && !minified.endsWith(';')) {
                    minified += ';';
                }
                return minified;
            } catch (e) {
                if (e.line) {
                    var dependency = lassoContext.dependency;
                    console.error('Unable to minify the following code for ' + dependency + ' at line ' + e.line + ' column ' + e.col + ':\n' +
                                  '------------------------------------\n' +
                                  code + '\n' +
                                  '------------------------------------\n');
                    return code;
                } else {
                    throw e;
                }
            }
        }
    });
};
