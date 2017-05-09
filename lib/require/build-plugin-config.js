var ok = require('assert').ok;
var Transforms = require('./util/Transforms');
var extend = require('raptor-util').extend;
var builtins = require('./builtins');
var resolve = require('./util/resolve');
var defaultGlobals = {
    'jquery': ['$', 'jQuery']
};
var lassoModulesClientTransport = require('lasso-modules-client/transport');
var getClientPath = lassoModulesClientTransport.getClientPath;
var lassoResolveFrom = require('lasso-resolve-from');
var ignore = require('ignore');
var nodePath = require('path');

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
    config.builtins = builtins.getBuiltins(config.builtins);

    config.getClientPath = getClientPath;

    var resolver =  config.resolver = resolve.createResolver(config.builtins, getClientPath);

    var babelConfig = {
    };

    if (userConfig.babel) {
        extend(babelConfig, userConfig.babel);
    }

    var babelPaths = babelConfig.paths;
    delete babelConfig.paths;

    var babelIgnoreFilter = babelPaths && ignore().add(babelPaths
        .map(function(path) { // add the root dir first
            return nodePath.join(config.rootDir, path);
        })
        .map(function(path) { // remove the root dir and make it relative
            return nodePath.relative(config.rootDir, path);
        })
    );

    function isPathWhitelistedForBabel(path) {
        if (!babelIgnoreFilter) {
            // Return true if no path filter is present
            return true;
        }

        var ignored = babelIgnoreFilter.filter(nodePath.relative(config.rootDir, path));
        return !ignored.length; // Inverse the value as it is a ignore pattern
    }

    config.isPathWhitelistedForBabel = isPathWhitelistedForBabel;



    babelConfig.extensions = babelConfig.extensions || ['es6'];

    config.babel = babelConfig;

    var babelConfigFinalized = false;
    /**
     * Lazily load the babel presets... it takes a long time!
     */
    config.getBabelConfig = function() {
        if (!babelConfigFinalized) {
            babelConfigFinalized = true;

            delete babelConfig.extensions;

            if (!babelConfig.presets) {
                babelConfig.presets = [require('babel-preset-es2015')];
            }
        }
        return babelConfig;
    };

    var transforms;
    if (config.transforms) {
        if (config.transforms.length > 0) {
            config.transforms = transforms = new Transforms(config.transforms, defaultProjectRoot);
        } else {
            config.transforms = undefined;
        }
    }


    resolveGlobals(config, resolver);

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