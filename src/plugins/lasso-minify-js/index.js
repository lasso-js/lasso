var Terser = require('terser');
var codeFrame = require('babel-code-frame');
var hasOwn = Object.prototype.hasOwnProperty;

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

        transform: async function(code, lassoContext) {
            if (pluginConfig.inlineOnly === true && !isInline(lassoContext)) {
                // Skip minification when we are not minifying inline code
                return code;
            }

            var minifyOptions = {};
            for (var key in pluginConfig) {
                if (key !== 'inlineOnly' && hasOwn.call(pluginConfig, key)) {
                    minifyOptions[key] = pluginConfig[key];
                }
            }

            try {
                var minified = (await Terser.minify(code, minifyOptions)).code;
                if (minified && !minified.endsWith(';')) {
                    return minified + ';';
                }
                return minified;
            } catch (e) {
                if (e.line) {
                    var dependency = lassoContext.dependency;
                    var frame = codeFrame(code, e.line, e.col, { highlightCode: true });
                    console.error(e.message + ' in ' + dependency + ' at line ' + e.line + ' column ' + e.col + ':\n' + frame);
                    return code;
                } else {
                    throw e;
                }
            }
        }
    });
};
