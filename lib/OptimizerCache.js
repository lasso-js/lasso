var logger = require('raptor-logging').logger(module);

function OptimizerCache(cacheProvider, key) {
    this.cacheProvider = cacheProvider;
    this.key = key;
    this.caches = {};

    this.optimizedPageCache = this.getCache('optimizedPages');
    this.bundleMappingsCache = this.getCache('bundleMappings');
    this.resourceUrlsCache = this.getCache('resourceUrls');
    this.dependencyChecksumsCache = this.getCache('dependencyChecksums');
}

OptimizerCache.prototype = {
    getCache: function(settingsName) {
        return this.caches[settingsName] || (this.caches[settingsName] = this.cacheProvider.getCache(settingsName, this.key));
    },

    getOptimizedPage: function(cacheKey, options) {
        var _this = this;
        return this.optimizedPageCache.get(
            cacheKey,
            options,
            function(err, optimizedPage) {
                if (err) {
                    logger.error('Error while optimizing page: ', err);
                    return;
                }
                optimizedPage.context.emit('cached', {
                        cacheKey: cacheKey,
                        builder: options && options.builder,
                        cache: _this,
                        optimizedPage: optimizedPage
                    });
            });
    },

    getBundleMappings: function(id, builder) {
        return this.bundleMappingsCache.get(id, {
            builder: builder
        });
    },

    getResourceUrl: function(path, builder) {
        return this.resourceUrlsCache.get(path, {
                builder: builder
            });
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