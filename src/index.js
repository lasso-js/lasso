require('raptor-logging');

const nodePath = require('path');
const configLoader = require('./config-loader');
const flags = require('./flags');
const transforms = require('./transforms');
const ok = require('assert').ok;
const fs = require('fs');
const raptorCache = require('raptor-cache');
const extend = require('raptor-util/extend');
const getClientPath = require('lasso-modules-client/transport').getClientPath;
const stripJsonComments = require('strip-json-comments');

if (!getClientPath) {
    throw new Error('getClientPath is not defined');
}

var configDefaults = {
    outputDir: 'static',
    urlPrefix: '/static',
    includeSlotNames: false,
    fingerprintsEnabled: true,
    resolveCssUrls: true,
    bundlingEnabled: true,
    minify: false
};

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
        config = JSON.parse(stripJsonComments(json));
    }

    if (!baseDir) {
        baseDir = config.baseDir || process.cwd();
    }

    if (!config.__Config) {
        config = configLoader.load(config, baseDir, filename, configDefaults);
    }

    var Lasso = require('./Lasso');
    var theLasso = new Lasso(config);
    return theLasso;
}

var defaultLasso = null;
var isConfigured = false;

function getDefaultLasso() {
    if (!defaultLasso) {
        // Fixes #82 - Make lasso a singleton. When resolving the default
        //             lasso use the global lasso unless this lasso
        //             was explicitly configured.
        if (!isConfigured && global.GLOBAL_LASSO) {
            defaultLasso = global.GLOBAL_LASSO.getDefaultLasso();
            return defaultLasso;
        }

        defaultLasso = create(
            exports.defaultConfig,
            exports.defaultConfigBaseDir,
            exports.defaultConfigFilename);
    }

    return defaultLasso;
}

function setDevelopmentMode() {
    extend(configDefaults, {
        fingerprintsEnabled: false,
        bundlingEnabled: false,
        minify: false
    });
}

var NODE_ENV = process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase();

if (NODE_ENV === 'development' || NODE_ENV === 'dev') {
    setDevelopmentMode();
}

function configure(config, baseDir, filename) {
    // Fixes #82 - Make lasso a singleton. The first lasso that is
    //             explicitly configured will become the default
    //             global instance.
    isConfigured = true;

    if (!global.GLOBAL_LASSO) {
        global.GLOBAL_LASSO = exports;
    }

    // Clear out the default lasso instance since that it will
    // be recreated with the new config.
    defaultLasso = null;

    exports.defaultConfig = config = config || {};
    exports.defaultConfigBaseDir = baseDir;
    exports.defaultConfigFilename = filename;
}

async function lassoPage(pageConfig) {
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

    return getDefaultLasso().lassoPage(pageConfig);
}

async function lassoResource (path, context) {
    return getDefaultLasso().lassoResource(path, context);
}

function clearCaches() {
    raptorCache.freeAll();
    require('./caching-fs').clearCaches();
}

exports.getDefaultLasso = getDefaultLasso;
exports.lassoPage = lassoPage;
exports.lassoResource = lassoResource;
exports.create = create;
exports.configure = configure;
exports.setDevelopmentMode = setDevelopmentMode;

exports.createFlagSet = flags.createFlagSet;
exports.isFlagSet = flags.isFlagSet;

exports.transforms = transforms;
exports.writers = require('./writers');

exports.flushAllCaches = raptorCache.flushAll;

exports.handleWatchedFileChanged = function(path) {
    console.log('[lasso] File modified: ' + path);
    clearCaches();
};

exports.clearCaches = clearCaches;
exports.getClientPath = getClientPath;

Object.defineProperty(exports, 'defaultLasso', {
    get: getDefaultLasso,
    enumerable: true,
    configurable: false
});

exports.toString = function () {
    return '[lasso@' + __filename + ']';
};

require('../browser-refresh').enable();
