var EventEmitter = require('events').EventEmitter;
var logger = require('raptor-logging').logger(module);

function evictOptimizedPageFromCache(cache, cacheKey, ttl) {
    logger.info('Scheduling cached object with key "' + cacheKey + '" to be evicted' + ttl + 'ms');
    
    setTimeout(function() {
        logger.info('Evicting cached object with key "' + cacheKey + '". TTL configured to be ' + ttl + 'ms');
        cache.removeOptimizedPage(cacheKey);
    }, ttl);
}

function handleRebuildCacheTimeout(eventArgs, rebuildTimeout) {
    function scheduleRebuild() {
        logger.debug('Scheduling optimized page to be rebuilt in ' + rebuildTimeout + 'ms');    
        setTimeout(function () {
            logger.debug('Rebuilding optimizer cache...');
            var optimizedPagePromise = eventArgs.cache.getOptimizedPage(eventArgs.cacheKey, eventArgs.builder, {rebuild: true});
            optimizedPagePromise
                .fail(function(e) {
                    logger.error("Error in handleRebuildCacheTimeout. Will try again.", e);
                    scheduleRebuild();
                });
        }, rebuildTimeout);
    }

    scheduleRebuild();
}

function handleCacheTimeToLive(eventArgs, ttl) {
    evictOptimizedPageFromCache(eventArgs.cache, eventArgs.cacheKey, ttl);
}

function OptimizerContext() {
    OptimizerContext.$super.call(this);

    this.attributes = {};
    var _this = this;

    this.on('cached', function(eventArgs) {

        var ttl = _this.cacheTTL;
        var rebuildTimeout = _this.cacheRebuildTimeout;

        if (ttl && ttl != -1) {
            handleCacheTimeToLive(eventArgs, ttl);    
        }
        
        if (rebuildTimeout && rebuildTimeout != -1) {
            handleRebuildCacheTimeout(eventArgs, rebuildTimeout);    
        }
    });
}

OptimizerContext.prototype = {
    setCacheRebuildTimeout: function(timeout) {
        this.cacheRebuildTimeout = timeout;
    },

    setCacheTimeToLive: function(ttl) {
        this.cacheTTL = ttl;
    }
};

require('raptor-util').inherit(OptimizerContext, EventEmitter);

module.exports = OptimizerContext;