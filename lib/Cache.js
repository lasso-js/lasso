function Cache(cacheProvider, context, key) {
    this.optimizedPageCache = cacheProvider.getCache('optimizedPages|' + key);
    this.bundleMappingsCache = cacheProvider.getCache('bundleMappings|' + key);
    this.resourceUrlsCache = cacheProvider.getCache('resourceUrls|' + key);
}

Cache.prototype = {

    getOptimizedPage: function(cacheKey, builder, options) {

        var rebuild = false;
        if (options) {
            rebuild = options.rebuild === true;
        }

        var optimizedPagePromise = this.optimizedPageCache.get(cacheKey);
        if ((rebuild || !optimizedPagePromise) && builder) {
            var _this = this;
            var alreadyCached = optimizedPagePromise != null;

            var newOptimizedPagePromise = builder();

            if (!alreadyCached) {
                this.addOptimizedPage(cacheKey, newOptimizedPagePromise);
            }
            
            newOptimizedPagePromise
                .then(function(optimizedPage) {
                    this.addOptimizedPage(cacheKey, newOptimizedPagePromise);

                    optimizedPage.context.emit('cached', {
                        cacheKey: cacheKey,
                        builder: builder,
                        cache: _this,
                        optimizedPage: optimizedPage
                    });
                })
                .fail(function(e) {
                    if (!alreadyCached) {
                        _this.removeOptimizedPage(cacheKey);
                    }
                });

            optimizedPagePromise = newOptimizedPagePromise;
        }
        return optimizedPagePromise;
    },

    removeOptimizedPage: function(cacheKey) {
        this.optimizedPageCache.remove(cacheKey);
    },
    
    addOptimizedPage: function(cacheKey, optimizedPage) {
        this.optimizedPageCache.put(cacheKey, optimizedPage);
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