var BundleMappings = require('./BundleMappings');
var promises = require('raptor-promises');
var listeners = require('raptor-listeners');
var extend = require('raptor-util').extend;
var BundleSetConfig = require('./BundleSetConfig');
var extensions = require('./extensions');

function Config(params) {
    this.configResource = null;
    
    this.bundlingEnabled = true;
    
    this.projectRoot = null;


    this.minifyJs = false;
    this.minifyCss = false;

    
    this.enabledExtensions = extensions.createExtensionSet();
    this.params = {};
    this.bundleSetConfigsByName = {};
    
    this.serverSourceMappings = [];
    this.pageConfigs = [];
    this.pageConfigsByName = {};
    this.checksumLength = 8;
    this.filters = [];
    this.bundlingEnabled = true;
    
    this.basePath = null;
    this.writer = null;
    this.includeSlotNameForBundles = false;
    this.plugins = [];
    this.pluginsObservable = listeners.createObservable();

    /*
     * The PageOptimizer Config does not have any wrappers enabled by default.
     * If wrappers are explicitly set then this value will be an object whose
     * keys are wrapper IDs and whose values are boolean values that indicate
     * whether or not that specific wrapper is enabled.
     */
    this.bundleWrappers = undefined;

    if (params) {
        extend(this.params, params);
    }
}

Config.prototype = {
    __Config: true,

    getPageConfig: function(name) {
        return this.pageConfigsByName[name];
    },

    addPlugin: function(pluginConfig) {
        var plugin;

        var module = pluginConfig.module;
        var inputConfig = pluginConfig.config;

        if (module) {
            if (module.create) {
                plugin = module.create(this);
            }
            else {
                plugin = module;
            }
        }

        var config = plugin.config || (plugin.config = {});

        if (inputConfig) {
            for (var name in inputConfig) {
                if (inputConfig.hasOwnProperty(name)) {
                    config[name] = inputConfig[name];
                }
            }
        }

        for (var key in plugin) {
            if (key.startsWith('on')) {
                var message = key.substring(2);
                message = message.charAt(0).toLowerCase() + message.substring(1);
                this.pluginSubscribe(message, plugin[key], plugin);
            }
        }

        this.plugins.push(plugin);
    },

    pluginSubscribe: function(message, callback, thisObj) {
        return this.pluginsObservable.subscribe(message, callback, thisObj);
    },

    notifyPlugins: function(message, eventArgs) {
        this.pluginsObservable.publish(message, eventArgs);
    },
    

    addFilter: function(filter) {
        if (!filter) {
            throw new Error('filter is required');
        }

        if (typeof filter === 'function') {
            filter = {
                filter: filter,
                name: '(anonymous)'
            };
        }

        if (typeof filter.filter !== 'function') {
            throw new Error('Invalid filter: ' + require('util').inspect(filter));
        }

        this.filters.push(filter);
    },
    
    getFilters: function() {
        return this.filters;
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
    
    registerPageConfig: function(pageConfig) {
        if (!pageConfig.name) {
            throw new Error('name is required for page');
        }
        this.pageConfigs.push(pageConfig);
        this.pageConfigsByName[pageConfig.name] = pageConfig;
    },

    getPageBundleSetConfig: function(pageName) {
        
        var pageConfig = this.getPageConfig(pageName),
            bundleSetConfig = null;
        
        if (pageConfig) {
            bundleSetConfig = pageConfig.bundleSetConfig;
        }
        
        if (!bundleSetConfig) {
            bundleSetConfig = this.getBundleSetConfig("default");
            
            if (!bundleSetConfig) {
                bundleSetConfig = this.addBundleSetConfig(new BundleSetConfig('default'));
            }
        }
        
        return bundleSetConfig;
    },
    
    createBundleMappings: function(bundleSetConfig, context) {

        if (!bundleSetConfig) {
            throw new Error('"bundleSetConfig" is required');
        }

        var bundleMappings = new BundleMappings(this, context);
        var promiseChain = promises.resolved();

        bundleSetConfig.forEachBundleConfig(function(bundleConfig) {
            promiseChain = promiseChain.then(function() {
                var bundleName = bundleConfig.name;
                
                if (!bundleName) {
                    throw new Error("Illegal state. Bundle name is required");
                }
                
                return bundleMappings.addDependenciesToBundle(
                    bundleConfig.dependencies,
                    bundleName,
                    bundleConfig);
            });
        });
            
        return promiseChain
            .then(function() {
                return bundleMappings;
            });
    },

    forEachPageConfig: function(callback, thisObj) {
        this.pageConfigs.forEach(callback, thisObj);
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

    enableBundleWrapper: function(wrapperId) {
        if (!this.bundleWrappers) {
            this.bundleWrappers = {};
        }
        this.bundleWrappers[wrapperId] = true;
    },

    disableBundleWrapper: function(wrapperId) {
        if (!this.bundleWrappers) {
            this.bundleWrappers = {};
        }
        this.bundleWrappers[wrapperId] = false;
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

    toString: function() {
        return '[' + __filename + ']';
    }
};

module.exports = Config;