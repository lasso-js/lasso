'use strict';

var raptorCache = require('raptor-cache');
var nodePath = require('path');
var LassoPageResult = require('./LassoPageResult');
var DEFAULT_BASE_CACHE_DIR = nodePath.join(require('app-root-dir').get(), '.cache/lasso');
var deserializeLassoPageResult = LassoPageResult.deserialize;
var serializeLassoPageResult = LassoPageResult.serialize;
var fs = require('fs');
var mkdirp = require('mkdirp');

function safeFilename(name) {
    return name.replace(/[^A-Za-z0-9_\-\.\/]/g, '-');
}

var CACHE_DEFAULTS = {
    '*': { // Any profile
        '*': { // Any cache
            store: 'memory' // Default to a memory store for all caches for all profiles
        },
        lassoPageResults: {
            store: 'memory',
            serialize: serializeLassoPageResult,
            deserialize: deserializeLassoPageResult
        },
        bundleMappings: {
            store: 'memory'
        },
        lassoedResources: {
            store: 'memory',
            valueType: 'json'
        },
        dependencyFingerprints: {
            store: 'disk',
            valueType: 'string'
        },
        read: {
            store: 'disk',
            singleFile: false,
            encoding: 'utf8'
        }
    },
    'production': { // Read and write to disk cache in production
        lassoPageResults: {
            store: 'disk'
        },
        bundleMappings: {
            store: 'memory'
        },
        lassoedResources: {
            store: 'disk'
        },
        dependencyFingerprints: {
            store: 'disk'
        }
    }
};

class SyncCache {
    constructor() {
        this._store = {};
    }

    getSync(key) {
        return this._store[key];
    }

    putSync(key, value) {
        this._store[key] = value;
    }
}

function LassoCache(key, options) {
    var cacheProfileName = options.profile;
    var keyParts = options.keyParts;

    var cacheManager;

    if (typeof options.cacheManagerFactory === 'function') {
        cacheManager = options.cacheManagerFactory({
            profile: cacheProfileName,
            profiles: options.profiles
        });
    }

    this.cacheManager = cacheManager || options.cacheManager || raptorCache.createCacheManager({
        profile: cacheProfileName,
        profiles: options.profiles
    });

    this.key = key;

    var _this = this;

    this.cacheManager.on('cacheConfigured', function(eventArgs) {
        var cacheName = eventArgs.name;
        var cacheConfig = eventArgs.config;

        if (!cacheConfig.dir) {
            // Just in case this this cache uses a disk store we will configure a safe directory to use
            cacheConfig.dir = nodePath.join(_this.baseCacheDir, safeFilename(cacheName));
        }
    });

    this.baseCacheName = safeFilename(cacheProfileName || 'default') + (key ? '/' + safeFilename(key) : '');
    this.baseCacheDir = options.dir || DEFAULT_BASE_CACHE_DIR;

    if (keyParts) {
        var keyDir = nodePath.join(this.baseCacheDir, this.baseCacheName);
        mkdirp.sync(keyDir);
        var keyFile = nodePath.join(keyDir, 'key');
        fs.writeFileSync(keyFile, JSON.stringify(keyParts), { encoding: 'utf8' });
    }

    // Merge in the lasso defaults (the user profiles, if any, have already been merged)
    this.configureCacheDefaults(CACHE_DEFAULTS);

    this.lassoPageResultCache = this.getCache('lassoPageResults');
    this.bundleMappingsCache = this.getCache('bundleMappings');
    this.lassoedResourcesCache = this.getCache('lassoedResources');
    this.dependencyFingerprintsCache = this.getCache('dependencyFingerprints');
    this.readCache = this.getCache('read');

    this.syncCaches = {};
}

LassoCache.prototype = {
    configureCacheDefaults: function(profileName, cacheConfigName, defaults) {
        this.cacheManager.configureCacheDefaults.apply(this.cacheManager, arguments);
    },

    getCache: function(name, cacheConfigName) {
        if (!cacheConfigName) {
            cacheConfigName = name;
        }

        name = this.baseCacheName + '/' + name;
        return this.cacheManager.getCache(name, cacheConfigName);
    },

    getSyncCache: function(name) {
        return this.syncCaches[name] || (this.syncCaches[name] = new SyncCache());
    },

    flushAll: function() {
        raptorCache.flushAll();
    },

    getLassoPageResult: function(cacheKey, options, callback) {
        return this.lassoPageResultCache.get(cacheKey, options, callback);
    },

    getBundleMappings: function(id, builder, callback) {
        return this.bundleMappingsCache.get(id.toString(), builder, callback);
    },

    getLassoedResource: function(path, builder, callback) {
        return this.lassoedResourcesCache.get(path, builder, callback);
    },

    getDependencyFingerprint: function(cacheKey, lastModified, builder, callback) {
        this.dependencyFingerprintsCache.get(
            cacheKey,
            {
                lastModified: lastModified,
                builder: builder
            },
            callback);
    }
};

module.exports = LassoCache;
