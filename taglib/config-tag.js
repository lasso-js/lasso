var getLassoRenderContext = require('./getLassoRenderContext');

module.exports = function render(input, out) {
    var lassoRenderContext = getLassoRenderContext(out);
    var config = lassoRenderContext.data.config = Object.assign({}, input);

    lassoRenderContext.data.timeout = input.timeout || 30000 /* 30s */;

    if (config.packagePath) {
        config.dependencies = [config.packagePath];
        delete config.packagePath;
    } else if (config.packagePaths) {
        config.dependencies = config.packagePaths;
        delete config.packagePaths;
    }

    if (config.enabledExtensions) {
        config.flags = config.enabledExtensions;
        delete config.enabledExtensions;
    } else if (config.extensions) {
        config.flags = config.extensions;
        delete config.extensions;
    }
};