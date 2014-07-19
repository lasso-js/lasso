// var OptimizedPage = require('./OptimizedPage');
var extend = require('raptor-util').extend;
var raptorCache = require('raptor-cache');
var OptimizedPage = require('./OptimizedPage');
var nodePath = require('path');

var OPTIMIZED_PAGE_CACHE_CONFIG = {
    store: 'disk',

    encoding: 'utf8',

    // we can return a string since we have provided an encoding
    serialize: function(value) {
        return JSON.stringify(value);
    },

    // data will be a string since we set encoding
    deserialize: function(reader, callback) {
        var json = '';

        reader()
            .on('data', function(data) {
                json += data;
            })
            .on('end', function() {
                var optimizedPage = new OptimizedPage();
                extend(optimizedPage, JSON.parse(json));
                callback(null, optimizedPage);
            })
            .on('error', function(err) {
                callback(err);
            });
    }
};

var BUNDLE_MAPPING_CACHE_CONFIG = {
    store: 'memory'
};

var OPTIMIZED_RESOURCES_CACHE_CONFIG = {
    store: 'memory'
};

var DEPENDENCY_CHECKSUM_CACHE_CONFIG = {
    store: 'disk',

    encoding: 'utf8',

    serialize: function(value) {
        return value;
    },

    deserialize: function(reader, callback) {
        var checksum = '';

        reader()
            .on('data', function(data) {
                checksum += data;
            })
            .on('end', function() {
                callback(null, checksum);
            })
            .on('error', function(err) {
                callback(err);
            });
    }
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
