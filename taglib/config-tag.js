var getLassoRenderContext = require('./getLassoRenderContext');

var util = require('./util');

module.exports = function render(input, out) {
    var lassoRenderContext = getLassoRenderContext(out);
    var config = lassoRenderContext.data.config = Object.assign({}, input);

    lassoRenderContext.data.timeout = input.timeout || util.getDefaultTimeout();

    if (config.packagePath) {
        config.packagePaths = [{
            type: 'package',
            path: config.packagePath
        }];
        delete config.packagePath;
    } else if (config.packagePaths) {
        config.packagePaths = config.packagePaths.map(packagePath => ({
            type: 'package',
            path: packagePath
        }));
    }

    if (config.enabledExtensions) {
        config.flags = config.enabledExtensions;
        delete config.enabledExtensions;
    } else if (config.extensions) {
        config.flags = config.extensions;
        delete config.extensions;
    }
};
