const raptorCache = require('raptor-cache');
const nodePath = require('path');
const LassoPageResult = require('./LassoPageResult');
const DEFAULT_BASE_CACHE_DIR = nodePath.join(require('app-root-dir').get(), '.cache/lasso');
const deserializeLassoPageResult = LassoPageResult.deserialize;
const serializeLassoPageResult = LassoPageResult.serialize;
const fs = require('fs');
const mkdirp = require('mkdirp');

function safeFilename(name) {
    return name.replace(/[^A-Za-z0-9_\-\.\/]/g, '-');
}

function waitImmediate() {
    return new Promise(resolve => setImmediate(resolve));
}

const CACHE_DEFAULTS = {
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
    production: { // Read and write to disk cache in production
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
    const cacheProfileName = options.profile;
    const keyParts = options.keyParts;

    let cacheManager;

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

    const _this = this;

    this.cacheManager.on('cacheConfigured', function(eventArgs) {
        const cacheName = eventArgs.name;
        const cacheConfig = eventArgs.config;

        if (!cacheConfig.dir) {
            // Just in case this this cache uses a disk store we will configure a safe directory to use
            cacheConfig.dir = nodePath.join(_this.baseCacheDir, safeFilename(cacheName));
        }
    });

    this.baseCacheName = safeFilename(cacheProfileName || 'default') + (key ? '/' + safeFilename(key) : '');
    this.baseCacheDir = options.dir || DEFAULT_BASE_CACHE_DIR;

    if (keyParts) {
        const keyDir = nodePath.join(this.baseCacheDir, this.baseCacheName);
        mkdirp.sync(keyDir);
        const keyFile = nodePath.join(keyDir, 'key');

        try {
            fs.writeFileSync(keyFile, JSON.stringify(keyParts), { encoding: 'utf8' });
        } catch (e) {
            // We only write the key for debugging purposes. On machines with
            // read only disks this will fail but that is okay
        }
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

    flushAll () {
        return raptorCache.flushAll();
    },

    async getLassoPageResult(cacheKey, options) {
        return this.lassoPageResultCache.get(cacheKey, options);
    },

    async getBundleMappings (id, builder) {
        await waitImmediate();

        while (process.domain) {
            process.domain.exit();
        }

        return this.bundleMappingsCache.get(id.toString(), { builder });
    },

    async getLassoedResource (path, builder) {
        await waitImmediate();

        while (process.domain) {
            process.domain.exit();
        }

        return this.lassoedResourcesCache.get(path, { builder });
    },

    async getDependencyFingerprint (cacheKey, lastModified, builder) {
        await waitImmediate();

        while (process.domain) {
            process.domain.exit();
        }

        return this.dependencyFingerprintsCache.get(cacheKey, {
            lastModified,
            builder
        });
    }
};

module.exports = LassoCache;
