var OptimizedPage = require('./OptimizedPage');
var extend = require('raptor-util').extend;


// optimizedPage.context.emit('cached', {
//         cacheKey: cacheKey,
//         builder: options && options.builder,
//         cache: _this,
//         optimizedPage: optimizedPage
//     });

function OptimizerCache(cacheProvider, key) {
    this.cacheProvider = cacheProvider;
    this.key = key;
    this.caches = {};

    this.optimizedPageCache = this.getCache('optimizedPages');
    this.bundleMappingsCache = this.getCache('bundleMappings');
    this.optimizedResourcesCache = this.getCache('optimizedResources');
    this.dependencyChecksumsCache = this.getCache('dependencyChecksums');
}

OptimizerCache.prototype = {
    getCache: function(settingsName) {
        return this.caches[settingsName] || (this.caches[settingsName] = this.cacheProvider.getCache(settingsName, this.key));
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