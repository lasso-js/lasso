"use strict";

var LassoContext = require('../../lib/LassoContext');
var dependencies = require('../../lib/dependencies');
var MockMemoryCache = require('./MockMemoryCache');

var fs = require('fs');
var nodePath = require('path');
var lassoCachingFS = require('lasso-caching-fs');

var Readable = require('stream').Readable;
var util = require('util');
var fingerprintStream = require('./fingerprint-stream');
var MockMemoryCache = require('./MockMemoryCache');
var MockRequireHandler = require('./MockRequireHandler');
var LassoManifest = require('./LassoManifest');
var manifestLoader = require('./manifest-loader');

var MOCK_CACHE = {
    get: function(key, options) {
        return new Promise((resolve, reject) => {
            if (options.builder) {
                resolve(options.builder());
            } else {
                resolve();
            }
        });
    },

    put: function(key, value, options) {

    },
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

var requireExtensions = {
    js: {
        object: false,
        createReadStream: function(path, lassoContext) {
            return function() {
                return fs.createReadStream(path, {encoding: 'utf8'});
            };
        }
    },
    json: {
        object: true,
        createReadStream: function(path, lassoContext) {
            return function() {
                return fs.createReadStream(path, {encoding: 'utf8'});
            };
        }
    }
};

module.exports = function createLassoContext(config) {
    var lassoContext = new LassoContext();
    var mockCaches = {};
    var syncCaches = {};
    var uniqueId = 0;
    lassoContext.isMockLassoContext = true;
    lassoContext.config = config;
    lassoContext.dependencyRegistry = {
        __DependencyRegistry: true,
        getRequireHandler: function(path, lassoContext) {
            var ext = nodePath.extname(path).substring(1);
            var requireExt = requireExtensions[ext];
            return {
                object: requireExt.object === true,

                async init() {
                    return Promise.resolve();
                },

                async getDependencies() {
                    return [];
                },

                createReadStream: requireExt.createReadStream(path, lassoContext),

                getLastModified: function() {
                    return Promise.resolve(-1);
                }
            };
        },

        createRequireHandler: function(path, lassoContext, userOptions) {
            return new MockRequireHandler(userOptions, lassoContext, path);
        },

        getRequireExtensionNames() {
            return Object.keys(requireExtensions).map((ext) => {
                return '.' + ext;
            });
        }
    }
    lassoContext.uniqueId = () => uniqueId++;
    lassoContext.cache = {
        getCache(name) {
            return mockCaches[name] || MOCK_CACHE;
        },
        getSyncCache(name) {
            return syncCaches[name] || (syncCaches[name] = new SyncCache());
        }
    };
    lassoContext.mockEnableCachingForCache = (cacheName) => {
        mockCaches[cacheName] = new MockMemoryCache();
    };
    return lassoContext;
}
