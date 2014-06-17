var OptimizedPage = require('./OptimizedPage');
var extend = require('raptor-util').extend;
var cacheDir = require('path').join(require('app-root-dir').get(), '.optimizer-cache');

var fs = require('fs');
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir);
}

function applyDefaultSettings(settings) {
    if (settings.disk || (settings.disk === undefined)) {
        if (typeof settings.disk !== 'object') {
            settings.disk = {};
        }

        if (settings.disk.read === undefined) {
            settings.disk.read = true;
        }

        if (settings.disk.write === undefined) {
            settings.disk.write = true;
        }

        if (settings.disk.dir === undefined) {
            settings.disk.dir = cacheDir;
        }
    }
}

function OptimizerCache(cacheProvider, key) {
    this.cacheProvider = cacheProvider;
    this.key = key;
    
    function getOptimizedPageCache(name) {
        var settings = cacheProvider.getCacheConfigIfExists(name) || {};
        
        if (settings.disk === undefined) {
            // disable disk cache for optimized pages if not explicitly configured
            settings.disk = false;
        }

        applyDefaultSettings(settings);

        return cacheProvider.getCache(name, key, settings);
    }

    function getDependencyChecksumCache(name) {
        var settings = cacheProvider.getCacheConfigIfExists(name) || {};
        
        applyDefaultSettings(settings);

        if (settings.disk && (settings.disk.singleFile === undefined)) {
            settings.disk.singleFile = true;
        }

        return cacheProvider.getCache(name, key, settings);
    }

    function getDefaultCache(name) {
        var settings = cacheProvider.getCacheConfigIfExists(name) || {};
        applyDefaultSettings(settings);
        return cacheProvider.getCache(name, key, settings);
    }

    this.optimizedPageCache = getOptimizedPageCache('optimizedPages');
    this.bundleMappingsCache = getDefaultCache('bundleMappings');
    this.optimizedResourcesCache = getDefaultCache('optimizedResources');
    this.dependencyChecksumsCache = getDependencyChecksumCache('dependencyChecksums');
}

OptimizerCache.prototype = {

    getCache: function(settingsName, defaultSettings) {
        return this.cacheProvider.getCache(settingsName, this.key, defaultSettings);
    },

    getCacheConfig: function(settingsName) {
        var settings = this.cacheProvider.getCacheConfigIfExists(settingsName) || {};
        applyDefaultSettings(settings);
        return settings;
    },

    getCacheDir: function() {
        return cacheDir;
    },

    getOptimizedPage: function(cacheKey, options, callback) {

        if (options) {
            options.deserialize = function(optimizedPage) {
                if (optimizedPage.__OptimizedPage) {
                    var o = new OptimizedPage();
                    extend(o, optimizedPage);
                    return o;
                } else {
                    return optimizedPage;
                }
            };
        }
        return this.optimizedPageCache.get(
            cacheKey,
            options,
            callback);
    },

    getBundleMappings: function(id, builder, callback) {
        return this.bundleMappingsCache.get(
            id,
            {
                builder: builder
            },
            callback);
    },

    getOptimizedResource: function(path, options, callback) {
        return this.optimizedResourcesCache.get(path, options, callback);
    },

    getDependencyChecksum: function(cacheKey, lastModified, builder) {
        return this.dependencyChecksumsCache.get(cacheKey, {
                lastModified: lastModified,
                builder: builder
            });
    },

    clear: function() {
        this.optimizedPageCache.clear();
        this.bundleMappingsCache.clear();
        this.resourceUrlsCache.clear();
    }
};

module.exports = OptimizerCache;