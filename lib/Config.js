var extend = require('raptor-util').extend;
var BundleSetConfig = require('./BundleSetConfig');
var extensions = require('./extensions');
var ok = require('assert').ok;
var optimizerRequirePlugin = require('optimizer-require');

function createFilterFromContentType(contentType) {
    var contentTypeMap = {};

    if (Array.isArray(contentType)) {
        // Include this array if the actual content type is in the array of supported content types
        var contentTypeArray = contentType;
        if (contentTypeArray.length === 0) {
            return function(optimizerContext, callback) {
                callback(null, true);
            };
        }

        for (var i=0, len=contentTypeArray.length; i<len; i++) {
            contentTypeMap[contentTypeArray[i]] = true;
        }
    } else {
        contentTypeMap[contentType] = true;
    }

    return function(optimizerContext, callback) {
        var contentType = optimizerContext.contentType;
        return callback(null, contentTypeMap[contentType] === true);
    };
}

function Config(params) {
    this.configResource = null;

    this.bundlingEnabled = true;

    this.projectRoot = null;

    this.enabledExtensions = extensions.createExtensionSet();
    this.params = {};
    this.bundleSetConfigsByName = {};
    this.fileWriterConfig = null;
    this.transforms = [];
    this.bundlingEnabled = true;
    this.basePath = null;
    this.writer = null;
    this.includeSlotNameForBundles = false;
    this._plugins = [];
    this.cacheProfiles = null;
    this.cacheProfile = null;
    this.cacheDir = null;
    this._requirePluginConfig = {};

    if (params) {
        extend(this.params, params);
    }

    this.addDefaultPlugins();
}

Config.prototype = {
    __Config: true,

    addDefaultPlugins: function() {
        this.addPlugin(optimizerRequirePlugin, this._requirePluginConfig);
    },

    getPlugins: function(pluginInfo) {
        return this._plugins;
    },

    addPlugin: function(func, config) {
        ok(typeof func === 'function', 'Plugin should be a function. Actual: ' + func);
        this._plugins.push({
            func: func,
            config: config || {}
        });
    },

    addTransform: function(transform) {
        if (!transform) {
            throw new Error('transform is required');
        }

        if (transform.enabled === false) {
            // Don't add transforms that are disabled
            return;
        }

        if (typeof transform === 'function') {
            transform = {
                transform: transform,
                name: '(anonymous)'
            };
        }

        if (typeof transform.transform !== 'function') {
            throw new Error('Invalid transform: ' + require('util').inspect(transform));
        }

        if (transform.contentType) {
            // Convert the contentType to a filter
            transform = extend({}, transform);
            transform.filter = createFilterFromContentType(transform.contentType);
            delete transform.contentType;
        }

        this.transforms.push(transform);
    },

    getTransforms: function() {
        return this.transforms;
    },

    isInPlaceDeploymentEnabled: function() {
        return this.inPlaceDeploymentEnabled === true;
    },

    isBundlingEnabled: function() {
        return this.bundlingEnabled;
    },

    addBundleSetConfig: function(bundleSetConfig) {
        if (!bundleSetConfig.name) {
            bundleSetConfig.name = "default";
        }

        if (this.bundleSetConfigsByName[bundleSetConfig.name]) {
            throw new Error('Bundles with name "' + bundleSetConfig.name + '" defined multiple times');
        }

        this.bundleSetConfigsByName[bundleSetConfig.name] = bundleSetConfig;

        return bundleSetConfig;
    },

    getBundleSetConfig: function(name) {
        return this.bundleSetConfigsByName[name];
    },

    enableExtension: function(name) {

        this.enabledExtensions.add(name);
    },

    getEnabledExtensions: function() {
        return this.enabledExtensions;
    },

    enableExtensions: function(enabledExtensions) {
        this.enabledExtensions = extensions.createExtensionSet(enabledExtensions);
    },

    getPageBundleSetConfig: function(pageName) {
        var bundleSetConfig = this.getBundleSetConfig("default");

        if (!bundleSetConfig) {
            bundleSetConfig = this.addBundleSetConfig(new BundleSetConfig('default'));
        }

        return bundleSetConfig;
    },

    setInPlaceDeploymentEnabled: function(inPlaceDeploymentEnabled) {
        this.inPlaceDeploymentEnabled = inPlaceDeploymentEnabled;
    },

    setInPlaceUrlPrefix: function(inPlaceUrlPrefix) {
        this.inPlaceUrlPrefix = inPlaceUrlPrefix;
    },

    getInPlaceUrlPrefix: function() {
        return this.inPlaceUrlPrefix;
    },

    getBasePath: function() {
        return this.basePath;
    },

    setBasePath: function(basePath) {
        this.basePath = basePath;
    },

    getWriter: function() {
        return this.writer;
    },

    setWriter: function(writer) {
        this.writer = writer;
    },

    getProjectRoot: function() {
        return this.projectRoot;
    },

    setProjectRoot: function(projectRoot) {
        this.projectRoot = projectRoot;
    },

    setBundlingEnabled: function(bundlingEnabled) {
        this.bundlingEnabled = bundlingEnabled;
    },

    setBundlingStrategy: function(bundlingStrategy) {
        this.bundlingStrategy = bundlingStrategy;
    },

    getBundlingStrategy: function() {
        return this.bundlingStrategy;
    },

    setCacheProfiles: function(cacheProfiles) {
        this.cacheProfiles = cacheProfiles;
    },

    getCacheProfiles: function() {
        return this.cacheProfiles;
    },

    setCacheProfile: function(cacheProfile) {
        this.cacheProfile = cacheProfile;
    },

    getCacheProfile: function() {
        return this.cacheProfile;
    },

    setCacheDir: function(cacheDir) {
        this.cacheDir = cacheDir;
    },

    getCacheDir: function() {
        return this.cacheDir;
    },

    toString: function() {
        return '[' + __filename + ']';
    }
};

module.exports = Config;
