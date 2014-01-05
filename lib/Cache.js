function Cache(cacheProvider, context, key) {
    this.optimizedPageCache = cacheProvider.getCache('optimizedPages|' + key);
    this.bundleMappingsCache = cacheProvider.getCache('bundleMappings|' + key);
    this.resourceUrlsCache = cacheProvider.getCache('resourceUrls|' + key);
}

Cache.prototype = {

    getOptimizedPage: function(pageKey) {
        return this.optimizedPageCache.get(pageKey);
    },

    removeOptimizedPage: function(pageKey) {
        this.optimizedPageCache.remove(pageKey);
    },
    
    addOptimizedPage: function(pageKey, optimizedPage) {
        this.optimizedPageCache.put(pageKey, optimizedPage);
    },
    
    getBundleMappings: function(id) {
        return this.bundleMappingsCache.get(id);
    },
    
    addBundleMappings: function(id, bundleMappings) {
        this.bundleMappingsCache.put(id, bundleMappings);
    },

    removeAllBundleMappings: function() {
        this.bundleMappingsCache.clear();
    },

    getResourceUrl: function(cacheKey) {
        return this.resourceUrlsCache.get(cacheKey);
    },

    addResourceUrl: function(cacheKey, resourceUrl) {
        return this.resourceUrlsCache.put(cacheKey, resourceUrl);
    },

    removeResourceUrl: function(cacheKey) {
        return this.resourceUrlsCache.remove(cacheKey);
    },


    clear: function() {
        this.optimizedPageCache.clear();
        this.resourceUrlsCache.clear();
    }
};

module.exports = Cache;