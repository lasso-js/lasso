var raptorCache = require('raptor-cache');
var nodePath = require('path');

var OPTIMIZED_PAGE_CACHE_CONFIG = {
    store: 'memory'
};

var BUNDLE_MAPPING_CACHE_CONFIG = {
    store: 'memory'
};

var OPTIMIZED_RESOURCES_CACHE_CONFIG = {
    store: 'memory'
};

var DEPENDENCY_CHECKSUM_CACHE_CONFIG = {
    store: 'disk',
    valueType: 'string'
};

var cacheManager = raptorCache.getDefaultCacheManager();

function OptimizerCache(key) {
    this.key = key;
    
    this.optimizedPageCache = cacheManager.getCacheByName(
        nodePath.join('raptor-optimizer', key, 'optimizedPage'), OPTIMIZED_PAGE_CACHE_CONFIG);
        
    this.bundleMappingsCache = cacheManager.getCacheByName(
        nodePath.join('raptor-optimizer', key, 'bundleMappings'), BUNDLE_MAPPING_CACHE_CONFIG);
        
    this.optimizedResourcesCache = cacheManager.getCacheByName(
        nodePath.join('raptor-optimizer', key, 'optimizedResources'), OPTIMIZED_RESOURCES_CACHE_CONFIG);
        
    this.dependencyChecksumsCache = cacheManager.getCacheByName(
        nodePath.join('raptor-optimizer', key, 'dependencyChecksums'), DEPENDENCY_CHECKSUM_CACHE_CONFIG);
}

OptimizerCache.prototype = {

    flushAll: function() {
        cacheManager.flushAll();
    },
    
    getCacheByName: function(name, defaultConfig) {
        return cacheManager.getCacheByName(name, defaultConfig);
    },
    
    getOptimizedPage: function(cacheKey, options, callback) {
        return this.optimizedPageCache.get(cacheKey, options, callback);
    },

    getBundleMappings: function(id, builder, callback) {
        return this.bundleMappingsCache.get(id.toString(), builder, callback);
    },

    getOptimizedResource: function(path, builder, callback) {
        return this.optimizedResourcesCache.get(path, builder, callback);
    },

    getDependencyChecksum: function(cacheKey, lastModified, builder, callback) {
        this.dependencyChecksumsCache.get(
            cacheKey,
            {
                lastModified: lastModified,
                builder: builder
            },
            callback);
    }
};

module.exports = OptimizerCache;
