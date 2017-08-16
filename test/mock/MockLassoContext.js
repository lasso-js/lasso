'use strict';

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
var resolve = require('../../lib/resolve');
var getClientPath = require('lasso-modules-client/transport').getClientPath;

function noop() {}

function DeferredStream(startFn, options) {
    var self = this;

    Readable.call(this, options);

    // When _read is called, we need to start pushing data
    self._read = function() {
        self._read = noop;
        var stream = startFn.call(self);
        if (stream) {
            stream
                .on('data', function(data) {
                    self.push(data);
                })
                .on('end', function() {
                    self.push(null);
                })
                .on('error', function(err) {
                    self.emit('error', err);
                })
                .resume();
        }
    };

    return self;
}

util.inherits(DeferredStream, Readable);

module.exports = DeferredStream;

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

    getSync: function() {
        return;
    },

    put: function(key, value, options) {

    },

    putSync: function(key, value, options) {

    }
};

class MockLassoContext {
    constructor() {
        this.data = {};
        this.phaseData = {};
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

        this.dependencyRegistry = {
            getRequireHandler: function(path, lassoContext) {
                var ext = nodePath.extname(path).substring(1);
                var requireExt = requireExtensions[ext];
                return {
                    object: requireExt.object === true,

                    async init () {
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
        };

        var mockCaches = this.mockCaches = {};

        this.cache = {
            getCache(name) {
                return mockCaches[name] || MOCK_CACHE;
            },
            getSyncCache(name) {
                return mockCaches[name] || MOCK_CACHE;
            }
        };

        this.nextId = 0;
    }

    get isMockLassoContext() {
        return true;
    }

    /**
     * Converts a "reader" function to a function that *always* returns a stream.
     * The actual reader function may return a promise, a String, a stream or it may use a callback.
     */
    createReadStream(func) {
        var stream = new DeferredStream(function() {
            // this function will be called when it is time to start reading data
            var finished = false;

            var callback = (err, value) => {
                if (finished) {
                    return;
                }

                if (err) {
                    stream.emit('error', err);
                    return;
                }

                if (value == null) {
                    stream.push(null);
                    finished = true;
                } else {
                    if (typeof value === 'string') {
                        stream.push(value);
                        stream.push(null);
                        finished = true;
                    } else if (typeof value.pipe === 'function') {
                        // Looks like a stream...
                        value.pipe(this);
                        finished = true;
                    } else if (typeof value.then === 'function') {
                        // Looks like a promise...
                        value
                            .then((value) => {
                                callback(null, value);
                            })
                            .catch(callback);
                    } else {
                        // Hopefully a Buffer
                        stream.push(value);
                        stream.push(null);
                        finished = true;
                    }
                }
            };

            var result = func(callback);

            if (!finished) {
                // callback was not invoked
                if (result === null) {
                    callback(null, null);
                } else if (result === undefined) {
                    // waiting on callback
                } else if (result && typeof result.pipe === 'function') {
                    finished = true;
                    return result;
                } else {
                    callback(null, result);
                    // A stream was returned, so we will return it
                }
            }
        });

        return stream;
    }

    mockEnableCachingForCache(cacheName) {
        this.mockCaches[cacheName] = new MockMemoryCache();
    }

    uniqueId() {
        return this.nextId++;
    }

    async getFileLastModified(path) {
        return Promise.resolve(-1);
    }

    isAsyncBundlingPhase() {
        return false;
    }

    get cachingFs() {
        return lassoCachingFS;
    }

    deferredStream(startFn, options) {
        return new DeferredStream(startFn, options);
    }

    createFingerprintStream() {
        return fingerprintStream.create();
    }

    readPackageFile(path) {
        var rawManifest = manifestLoader.load(path);
        return new LassoManifest({
            manifest: rawManifest,
            dependencyRegistry: this.dependencyRegistry
        });
    }

    getResolver() {
        if (this.resolver === undefined) {
            this.resolver = resolve.createResolver(this, getClientPath);
        }
        return this.resolver;
    }

    resolve(targetModule, fromDir, options) {
        return this.getResolver().resolve(targetModule, fromDir, options);
    }

    resolveCached(targetModule, fromDir, options) {
        return this.getResolver().resolveCached(targetModule, fromDir, options);
    }
}

module.exports = MockLassoContext;
