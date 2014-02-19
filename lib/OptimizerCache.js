var logger = require('raptor-logging').logger(module);

function OptimizerCache(cacheProvider, key) {
    this.optimizedPageCache = cacheProvider.getCache('optimizedPages', key);
    this.bundleMappingsCache = cacheProvider.getCache('bundleMappings', key);
    this.resourceUrlsCache = cacheProvider.getCache('resourceUrls', key);
    this.dependencyChecksumsCache = cacheProvider.getCache('dependencyChecksums', key);
}

OptimizerCache.prototype = {

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