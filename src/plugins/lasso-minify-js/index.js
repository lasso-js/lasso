const Terser = require('terser');
const codeFrame = require('@babel/code-frame');
const hasOwn = Object.prototype.hasOwnProperty;

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

            const minifyOptions = {};
            for (const key in pluginConfig) {
                if (key !== 'inlineOnly' && hasOwn.call(pluginConfig, key)) {
                    minifyOptions[key] = pluginConfig[key];
                }
            }

            try {
                const minified = (await Terser.minify(code, minifyOptions)).code;
                if (minified && !minified.endsWith(';')) {
                    return minified + ';';
                }
                return minified;
            } catch (e) {
                if (e.line) {
                    const dependency = lassoContext.dependency;
                    const frame = codeFrame(code, e.line, e.col, { highlightCode: true });
                    console.error(e.message + ' in ' + dependency + ' at line ' + e.line + ' column ' + e.col + ':\n' + frame);
                    return code;
                } else {
                    throw e;
                }
            }
        }
    });
};
