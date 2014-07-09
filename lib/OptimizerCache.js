// var OptimizedPage = require('./OptimizedPage');
// var extend = require('raptor-util').extend;
var raptorCache = require('raptor-cache');
// var baseCacheDir = require('path').join(require('app-root-dir').get(), '.optimizer-cache');

function OptimizerCache(key) {
    
    this.key = key;

    // TODO: All caches need to be given a serializer and deserializer if they 
    //       are to support a disk store!!!

    this.optimizedPageCache = raptorCache.createMemoryCache();
    this.bundleMappingsCache = raptorCache.createMemoryCache();
    this.optimizedResourcesCache = raptorCache.createMemoryCache();
    this.dependencyChecksumsCache = raptorCache.createMemoryCache();
}

OptimizerCache.prototype = {

    getOptimizedPage: function(cacheKey, options, callback) {

        // if (options) {
        //     options.deserialize = function(optimizedPage) {
        //         if (optimizedPage.__OptimizedPage) {
        //             var o = new OptimizedPage();
        //             extend(o, optimizedPage);
        //             return o;
        //         } else {
        //             return optimizedPage;
        //         }
        //     };
        // }
        return this.optimizedPageCache.get(
            cacheKey,
            options,
            callback);
    },

    getBundleMappings: function(id, builder, callback) {
        return this.bundleMappingsCache.get(
            id,
            builder,
            callback);
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