var nodePath = require('path');
var configLoader = require('./config-loader');
var flags = require('./flags');
var transforms = require('./transforms');
var ok = require('assert').ok;
var fs = require('fs');
var raptorCache = require('raptor-cache');

exports.defaultConfig = {};
exports.defaultConfigBaseDir = process.cwd();
exports.defaultConfigFilename = null;

function create(config, baseDir, filename) {
    if (!config) {
        config = exports.defaultConfig;
    } else if (typeof config === 'string') {
        filename = config;
        filename = nodePath.resolve(process.cwd(), filename);

        baseDir = nodePath.dirname(filename);
        var json = fs.readFileSync(filename, {encoding: 'utf8'});
        config = JSON.parse(json);
    }

    if (!baseDir) {
        baseDir = config.baseDir || process.cwd();
    }

    if (!config.__Config) {
        config = configLoader.load(config, baseDir, filename);
    }

    var Lasso = require('./Lasso');
    var theLasso = new Lasso(config);
    return theLasso;
}

var defaultLasso = null;

function getDefaultLasso() {
    if (!defaultLasso) {

        defaultLasso = create(
            exports.defaultConfig,
            exports.defaultConfigBaseDir,
            exports.defaultConfigFilename);
    }

    return defaultLasso;
}


function configure(config, baseDir, filename) {
    exports.defaultConfig = config || {};
    exports.defaultConfigBaseDir = baseDir;
    exports.defaultConfigFilename = filename;
}

function lassoPage(pageConfig, callback) {
    ok(pageConfig, '"pageConfig" is required');
    ok(typeof pageConfig === 'object', '"pageConfig" should be an object');

    var dependencies = pageConfig.dependencies;
    var packagePath = pageConfig.packagePath;

    ok(dependencies || packagePath, '"page.dependencies" or "page.packagePath" is required');
    if (dependencies) {
        ok(typeof dependencies === 'string' || Array.isArray(dependencies), '"dependencies" should be an Array or a String');
    }

    if (typeof dependencies === 'string') {
        packagePath = nodePath.resolve(process.cwd(), dependencies);
        dependencies = null;
    } else if (typeof packagePath === 'string') {
        packagePath = nodePath.resolve(process.cwd(), packagePath);
    }

    return getDefaultLasso().lassoPage(pageConfig, callback);
}

function lassoResource(path, context, callback) {
    return getDefaultLasso().lassoResource(path, context, callback);
}

exports.getDefaultLasso = getDefaultLasso;
exports.lassoPage = lassoPage;
exports.lassoResource = lassoResource;
exports.create = create;
exports.configure = configure;

exports.createFlagSet = flags.createFlagSet;
exports.isFlagSet = flags.isFlagSet;

exports.createExtensionSet = flags.createFlagSet;  // Deprecated
exports.isExtensionSet = flags.isFlagSet; // Deprecated

exports.transforms = transforms;
exports.writers = require('./writers');
exports.flushAllCaches = raptorCache.flushAll;
exports.handleWatchedFileChanged = function(path) {
    console.log('[lasso] File modified: ' + path);
    raptorCache.freeAll();
    require('./caching-fs').clear();
};

Object.defineProperty(exports, 'defaultLasso', {
    get: getDefaultLasso,
    enumerable : true,
    configurable : false
});

Object.defineProperty(exports, 'pageOptimizer', {
    get: function() {
        throw new Error('Property "pageOptimizer" has been removed. Use property "defaultLasso" instead.');
    },
    enumerable : true,
    configurable : false
});

exports.toString = function () {
    return '[lasso@' + __filename + ']';
};
