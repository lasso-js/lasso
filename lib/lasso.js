/**
 * The optimizer module is used to generated optimized
 * web pages--including optimized resource bundles and the HTML markup
 * to dependency the optimized resource bundles in an HTML page.
 *
 * Simple usage:
 * <js>
 * var optimizer = require('raptor/optimizer');
 * optimizer.configure('path/to/optimizer-config.xml', params);
 * var optimizedPage = optimizer.optimizePage({
 *         name: "test-page",
 *         packageManifest: 'path/to/test-page-package.json'
 *     });
 *
 * var headHtml = optimizedPage.getSlotHtml('head');
 * var bodyHtml = optimizedPage.getSlotHtml('body');
 * var loaderMeta = optimizedPage.getLoaderMetadata();
 * ...
 * </js>
 *
 * For more information, please see the <a href="http://raptorjs.org/optimizer/">Optimizer Documentation</a>.
 */
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
        var json = fs.readFileSync(filename, 'utf8');
        config = JSON.parse(json);
    }

    if (!baseDir) {
        baseDir = config.baseDir || process.cwd();
    }

    if (!config.__Config) {
        config = configLoader.load(config, baseDir, filename);
    }

    var PageOptimizer = require('./PageOptimizer');
    var pageOptimizer = new PageOptimizer(config);
    return pageOptimizer;
}

var defaultPageOptimizer = null;

function getDefaultPageOptimizer() {
    if (!defaultPageOptimizer) {

        defaultPageOptimizer = create(
            exports.defaultConfig,
            exports.defaultConfigBaseDir,
            exports.defaultConfigFilename);
    }

    return defaultPageOptimizer;
}


function configure(config, baseDir, filename) {
    exports.defaultConfig = config || {};
    exports.defaultConfigBaseDir = baseDir;
    exports.defaultConfigFilename = filename;
}

/**
 * get OptimizerRenderContext from a normal render context (async-writer/Context)
 */
function optimizePage(pageConfig, callback) {
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

    return getDefaultPageOptimizer().optimizePage(pageConfig, callback);
}

function optimizeResource(path, context, callback) {
    return getDefaultPageOptimizer().optimizeResource(path, context, callback);
}

exports.getDefaultPageOptimizer = getDefaultPageOptimizer;
exports.optimizePage = optimizePage;
exports.optimizeResource = optimizeResource;
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
    console.log('[optimizer] File modified: ' + path);
    raptorCache.freeAll();
    require('./caching-fs').clear();
};

Object.defineProperty(exports, 'defaultPageOptimizer', {
    get: getDefaultPageOptimizer,
    enumerable : true,
    configurable : false
});

Object.defineProperty(exports, 'pageOptimizer', {
    get: function() {
        throw new Error('Property "pageOptimizer" has been removed. Use property "defaultPageOptimizer" instead.');
    },
    enumerable : true,
    configurable : false
});

exports.toString = function () {
    return '[optimizer@' + __filename + ']';
};
