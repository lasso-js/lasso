var extend = require('raptor-util').extend;
var BundleSetConfig = require('./BundleSetConfig');
var flags = require('./flags');
var ok = require('assert').ok;
var lassoRequirePlugin = require('lasso-require');
var crypto = require('crypto');
var inspect = require('util').inspect;

function createFilterFromContentType(contentType) {
    var contentTypeMap = {};

    if (Array.isArray(contentType)) {
        // Include this array if the actual content type is in the array of supported content types
        var contentTypeArray = contentType;
        if (contentTypeArray.length === 0) {
            return function(lassoContext, callback) {
                callback(null, true);
            };
        }

        for (var i=0, len=contentTypeArray.length; i<len; i++) {
            contentTypeMap[contentTypeArray[i]] = true;
        }
    } else {
        contentTypeMap[contentType] = true;
    }

    return function(lassoContext, callback) {
        var contentType = lassoContext.contentType;
        return callback(null, contentTypeMap[contentType] === true);
    };
}

function calculateConfigFingerprint(config) {
    // Instead of trying to be clever we we just going to hard code
    // handling of each support configuration for now...

    var hash = crypto.createHash('sha1');

    function update(value) {
        if (value == null) {
            return;
        }

        hash.update(value.toString());
    }

    // Handle top-level config options
    update(config.bundlingEnabled);
    update(config.flags.getKey());
    update(config.inPlaceDeploymentEnabled);
    update(config.bundlingStrategy);

    // Handle transforms
    config.transforms.forEach(function(transform) {
        update(transform.name);
        update(transform.contentType);
        update(transform.filter);
        update(transform.transform); // The actual transform Function
    });

    // Handle plugins
    config._plugins.forEach(function(pluginConfig) {
        update(pluginConfig.func.toString());
        update(inspect(pluginConfig.config, { showHidden: true, depth: 2 }));
    });

    if (this.fileWriterConfig) {
        update(config.fileWriterConfig.outputDir);
        update(config.fileWriterConfig.urlPrefix);
        update(config.fileWriterConfig.fingerprintsEnabled);
        update(config.fileWriterConfig.includeSlotNames);
        update(config.fileWriterConfig.fingerprintLength);
    }

    update(inspect(config.bundleSetConfigsByName, { showHidden: true, depth: 4 }));

    // Bust cache if writer impl is different
    if (config.writer && config.writer.impl) {
        update(config.writer.impl.writeBundle);
        update(config.writer.impl.writeResource);
    }

    return hash.digest('hex');
}

function Config(params) {
    this.configResource = null;

    this.bundlingEnabled = true;

    this.projectRoot = null;

    this.flags = flags.createFlagSet();
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

    this._configFingerprint = null;
}

Config.prototype = {
    __Config: true,

    /**
     * The goal of this method is to return a String that uniquely identifies
     * this configuration. This is needed for caching purposes in that we want
     * to discard cached items if the configuration changes. For example, if
     * a new transform is added then the previously cached transformed items
     * should not be used.
     */
    getConfigFingerprint: function() {
        if (!this._configFingerprint) {
            this._configFingerprint = calculateConfigFingerprint(this);
        }

        return this._configFingerprint;
    },

    addDefaultPlugins: function() {
        this.addPlugin(lassoRequirePlugin, this._requirePluginConfig);
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
                transform: transform
            };
        }

        if (typeof transform.transform !== 'function') {
            throw new Error('Invalid transform: ' + require('util').inspect(transform));
        }

        transform.name = transform.name || transform.transform.name || '(anonymous)'; // Use the function name

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

    enableFlag: function(name) {
        this.flags.add(name);
    },

    /**
     * @deprecated
     */
    enableExtension: function(name) {
        this.flags.add(name);
    },

    getFlags: function() {
        return this.flags;
    },

    setFlags: function(newFlags) {
        this.flags = flags.createFlagSet(newFlags);
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
        if (projectRoot != null) {
            var len = projectRoot.length;
            // chop off trailing slash so that our path operations are consistent
            if (projectRoot.charAt(len - 1) === '/' || projectRoot.charAt(len - 1) === '\\') {
                projectRoot = projectRoot.substring(0, len - 1);
            }
        }
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
    },

    setBundleReadTimeout: function(timeout) {
        this.bundleReadTimeout = timeout;
    },

    getBundleReadTimeout: function() {
        return this.bundleReadTimeout;
    }
};

module.exports = Config;
