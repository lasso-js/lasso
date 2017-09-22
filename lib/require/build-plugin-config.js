var ok = require('assert').ok;
var Transforms = require('./util/Transforms');
var extend = require('raptor-util').extend;
var defaultGlobals = {
    'jquery': ['$', 'jQuery']
};
var lassoModulesClientTransport = require('lasso-modules-client/transport');
var getClientPath = lassoModulesClientTransport.getClientPath;
var lassoResolveFrom = require('lasso-resolve-from');

function resolveGlobals(config) {
    var globals = {};

    Object.keys(defaultGlobals).forEach(function(moduleName) {
        var varNames = defaultGlobals[moduleName];
        var resolved = lassoResolveFrom(config.rootDir, moduleName);

        if (resolved) {
            if (!Array.isArray(varNames)) {
                varNames = [varNames];
            }
            globals[resolved.path] = varNames;
        }
    });

    if (config.globals) {
        extend(globals, config.globals);
    }

    config.globals = globals;
}

function buildPluginConfig(userConfig, defaultProjectRoot) {
    var config = userConfig ? extend({}, userConfig) : {};

    config.rootDir = config.rootDir || defaultProjectRoot || process.cwd();

    ok(config.rootDir, '"rootDir" is required');

    config.runImmediately = config.runImmediately === true;

    config.getClientPath = getClientPath;

    if (config.transforms) {
        if (config.transforms.length > 0) {
            config.transforms = new Transforms(config.transforms, defaultProjectRoot);
        } else {
            config.transforms = undefined;
        }
    }

    resolveGlobals(config);

    if (config.modulesRuntimeGlobal) {
        if (!config.unbundledTargetPrefix) {
            // Use the modules global variable name as the unbundled
            // target prefix (it will get sanitized later)
            config.unbundledTargetPrefix = config.modulesRuntimeGlobal;
        }

        // Sanitize the global variable name
        config.modulesRuntimeGlobal =
            config.modulesRuntimeGlobal.replace(/[^a-zA-Z0-9\_\$]+/g, '_');
    } else {
        // Use empty string simply because this used as part of the read
        // cache key for "commonjs-def" dependencies.
        config.modulesRuntimeGlobal = '';
    }

    var prefix;
    if ((prefix = config.unbundledTargetPrefix)) {
        // Build a friendly looking prefix which is used to create
        // nested directories when module output files are not bundled.
        prefix = prefix.replace(/[^a-zA-Z0-9\_]+/g, '-');

        // remove any leading and trailing "-" characters that may
        // have been created and store the result
        config.unbundledTargetPrefix =
            prefix.replace(/^-+/, '').replace(/-+$/, '');
    }

    config.extensions = userConfig.extensions || ['.js'];

    return config;
}

module.exports = buildPluginConfig;
