var nodePath = require('path');
var condition = require('../condition');

var CONTENT_TYPE_CSS = require('../content-types').CSS;
var CONTENT_TYPE_JS = require('../content-types').JS;
var CONTENT_TYPE_NONE = require('../content-types').NONE;
var util = require('../util');
var ok = require('assert').ok;
var equal = require('assert').equal;
var Readable = require('stream').Readable;
var manifestLoader = require('../manifest-loader');
var logger = require('raptor-logging').logger(module);
var lastModified = require('../last-modified');
var AsyncValue = require('raptor-async/AsyncValue');
var EventEmitter = require('events').EventEmitter;

var NON_KEY_PROPERTIES = {
    inline: true,
    slot: true,
    'js-slot': true,
    'css-slot': true,
    getDefaultBundleName: true
};

function getPackagePath(d) {
    return d.__filename ? d.__filename : '(unknown)';
}

function doCalculateFingerprint (dependency, lassoContext) {
    return new Promise((resolve, reject) => {
        var input = dependency.read(lassoContext);
        var cachingReadStream = util.createCachingStream();

        var fingerprintStream = util.createFingerprintStream()
            .on('error', reject)
            .on('fingerprint', function(fingerprint) {
                dependency._cachingReadStream = cachingReadStream;
                if (logger.isDebugEnabled()) {
                    logger.debug('Dependency ' + dependency.toString() + ' fingerprint key: ' + fingerprint);
                }
                resolve(fingerprint);
            });

        // Don't buffer the data so that the stream can be drained
        fingerprintStream.resume();

        input
            .on('error', function(e) {
                var message = 'Unable to read dependency "' + dependency + '" referenced in "' + dependency.getParentManifestPath() + '". ';
                if (e.code === 'ENOENT' && e.path) {
                    message += 'File does not exist: ' + e.path;
                } else {
                    message += 'Error: ' + (e.stack || e);
                }
                e = new Error(message);
                e.dependency = dependency;
                reject(e);
            })
            .pipe(cachingReadStream)
            .pipe(fingerprintStream);
    });
};

// This is a simple stream implementation that either has code available
// immediately or it is waiting for code to be made available upon
// callback completion
function DependencyReadable() {

}

require('util').inherits(DependencyReadable, Readable);

DependencyReadable.prototype._read = function() {
    // don't need to actually implement _read because
};

function Dependency(dependencyConfig, dirname, filename) {
    ok(dependencyConfig != null, '"dependencyConfig" is a required argument');
    equal(typeof dependencyConfig, 'object', '"dependencyConfig" should be an object');

    ok(dirname, '"dirname" is a required argument');
    equal(typeof dirname, 'string', '"dirname" should be a string');

    this._resolvedInit = undefined;
    this._keyAsyncValue = undefined;
    this._lastModifiedAsyncValue = undefined;
    this._cachingReadStream = undefined;

    // The directory associated with this dependency.
    // If the dependency was defined in an browser.json
    // file then the directory is the directory in which
    // browser.json is found.
    this.__dirname = dirname;
    this.__filename = filename;

    this.type = dependencyConfig.type;

    this._condition = condition.fromObject(dependencyConfig);
    this._events = undefined;

    this.set(dependencyConfig);
}

Dependency.prototype = {
    __Dependency: true,

    properties: {
        'type': 'string',
        'attributes': 'object',
        'inline': 'string',
        'slot': 'string',
        'css-slot': 'string',
        'js-slot': 'string',
        // TODO: Change: Should these be removed?
        'if': 'string',
        'if-extension': 'string', /* DEPRECRATED */
        'if-not-extension': 'string', /* DEPRECRATED */
        'if-flag': 'string',
        'if-not-flag': 'string',
        'getDefaultBundleName': 'function'
    },

    async init (lassoContext) {
        this._context = lassoContext;

        if (this._resolvedInit) {
            return;
        }

        await this.doInit(lassoContext);
        this._resolvedInit = true;
    },

    async doInit (lassoContext) {},

    createReadStream: function(lassoContext) {
        if (this._cachingReadStream) {
            return this._cachingReadStream.createReplayStream();
        }

        return this.doRead(lassoContext);
    },

    /**
     *
     * @deprecated use createReadStream instead
     */
    read: function(lassoContext) {
        return this.createReadStream(lassoContext);
    },

    set: function(props) {
        var propertyTypes = this.properties;

        for (var k in props) {
            if (props.hasOwnProperty(k)) {
                var v = props[k];

                if (propertyTypes) {
                    var type = propertyTypes[k];
                    if (!type && !k.startsWith('_')) {
                        throw new Error('Dependency of type "' + this.type + '" does not support property "' + k + '". Package: ' + getPackagePath(this));
                    }

                    if (type && typeof v === 'string') {
                        if (type === 'boolean') {
                            v = (v === 'true');
                        } else if (type === 'int' || type === 'integer') {
                            v = parseInt(v, 10);
                        } else if (type === 'float' || type === 'number') {
                            v = parseFloat(v);
                        } else if (type === 'path') {
                            v = this.resolvePath(v);
                        }
                    }
                }

                this[k] = v;
            }
        }
    },

    /*
     * This resolve method will use the module search path to resolve
     * the given path if the path does not begin with "." or "/".
     *
     * For example, dependency.resolvePath('some-module/a.js')
     * will use the NodeJS module search path starting from this dependencies directory.
     * If resolution fails using the NodeJS module search path, then an attempt
     * will be made to resolve the path as a relative path.
     *
     * dependency.resolvePath('./a.js') we be resolved relative to the
     * directory of this dependency.
     *
     * dependency.resolvePath('/a.js') is assumed to be absolute
     * (possibly because it was already resolved).
     */
    resolvePath: function(path, from) {
        var result = this._context.resolve(path, from || this.__dirname, {
            moduleFallbackToRelative: true
        });
        return result && result.path;
    },

    getParentManifestDir: function() {
        return this.__dirname;
    },

    getParentManifestPath: function() {
        return this.__filename;
    },

    isPackageDependency: function() {
        return this._packageDependency === true;
    },

    /**
     * This method is called to determine if a depednency can be added to a shared
     * application bundle or if it can only be added to a page bundle.
     * This method can be overridden, but the default behavior is to return
     * false to indicate that it can be added to either a shared application
     * bundle or a page-specific bundle.
     * @return {boolean} Returns true if this is a page-bundle only dependency. False, otherwise.s
     */
    isPageBundleOnlyDependency: function() {
        return false;
    },

    onAddToPageBundle: function(bundle, lassoContext) {
        // subclasses can override
    },

    onAddToAsyncPageBundle: function(bundle, lassoContext) {
        // subclasses can override
    },

    async getPackageManifest (lassoContext) {
        if (!this.isPackageDependency()) {
            throw new Error('getPackageManifest() failed. Dependency is not a package: ' + this.toString());
        }

        let manifest;

        if (typeof this.loadPackageManifest === 'function') {
            let packageManifestResult;
            packageManifestResult = await this.loadPackageManifest(lassoContext);

            if (!packageManifestResult) {
                return null;
            }

            var dependencyRegistry = this.__dependencyRegistry;
            var LassoManifest = require('../LassoManifest');

            if (typeof packageManifestResult === 'string') {
                var manifestPath = packageManifestResult;
                var from = this.getParentManifestDir();

                try {
                    manifest = this.createPackageManifest(manifestLoader.load(manifestPath, from));
                } catch (e) {
                    var err;
                    if (e.fileNotFound) {
                        err = new Error('Lasso manifest not found for path "' +
                            manifestPath + '" (searching from "' + from + '"). Dependency: ' +
                            this.toString());
                    } else {
                        err = new Error('Unable to load lasso manifest for path "' +
                            manifestPath + '". Dependency: ' + this.toString() + '. Exception: ' +
                            (e.stack || e));
                    }

                    throw err;
                }
            } else if (!LassoManifest.isLassoManifest(packageManifestResult)) {
                manifest = new LassoManifest({
                    manifest: packageManifestResult,
                    dependencyRegistry: dependencyRegistry,
                    dirname: this.getParentManifestDir(),
                    filename: this.getParentManifestPath()
                });
            } else {
                manifest = packageManifestResult;
            }

            return manifest;
        } else if (typeof this.getDependencies === 'function') {
            let dependencies = await this.getDependencies(lassoContext);
            if (dependencies) {
                manifest = this.createPackageManifest(dependencies);
            }

            return manifest;
        } else {
            throw new Error('getPackageManifest() failed. "getDependencies" or "loadPackageManifest" expected: ' + this.toString());
        }
    },

    _getKeyPropertyNames: function() {
        return Object.keys(this)
            .filter(function(k) {
                return !k.startsWith('_') && k !== 'type' && !NON_KEY_PROPERTIES.hasOwnProperty(k);
            }, this)
            .sort();
    },

    getKey: function() {
        if (!this._keyAsyncValue || !this._keyAsyncValue.isResolved()) {
            return null;
            // throw new Error('getKey() was called before key was calculated');
        }
        return this._keyAsyncValue.data;
    },

    /**
     * getReadCacheKey() must be a unique key across all lasso context since
     * it is flattened to single level and shared by multiple lasso instances.
     */
    getReadCacheKey: function() {
        return undefined;
    },

    getPropsKey: function() {
        return this._propsKey || (this._propsKey = this.calculateKeyFromProps());
    },

    /**
     * calculateKey() is used to calculate a unique key for this dependency
     * that is unique within the given lasso context.
     *
     * getReadCacheKey() must be a unique key across all lasso context since
     * it is flattened to single level and shared by multiple lasso instances.
     */
    calculateKey (lassoContext) {
        // TODO: Change to fully use async/await
        return new Promise((resolve, reject) => {
            function callback (err, res) {
                return err ? reject(err) : resolve(res);
            }

            if (this._key !== undefined) {
                return callback(null, this._key);
            }

            if (this._keyAsyncValue) {
                // Attach a listener to the current in-progres check
                return this._keyAsyncValue.done(callback);
            }

            // no data holder so let's create one
            var keyAsyncValue;
            this._keyAsyncValue = keyAsyncValue = new AsyncValue();
            this._keyAsyncValue.done(callback);

            let handleKey = (key) => {
                if (key === null) {
                    key = this.type + '|' + lassoContext.uniqueId();
                } else if (typeof key !== 'string') {
                    keyAsyncValue.reject(new Error('Invalid key: ' + key));
                    return;
                }

                if (logger.isDebugEnabled()) {
                    logger.debug('Calculated key for ' + this.toString() + ': ' + key);
                }

                // Store resolve key in "_key" for quick lookup
                this._key = key;
                keyAsyncValue.resolve(key);
            };

            const keyResult = this.doCalculateKey(lassoContext);

            if ((typeof keyResult === 'string') && !keyAsyncValue.isSettled()) {
                handleKey(keyResult);
            } else if (keyResult && typeof keyResult === 'object' && keyResult.then) {
                keyResult
                    .then((key) => {
                        handleKey(key);
                    })
                    .catch((err) => {
                        keyAsyncValue.reject(err);
                    });
            } else {
                return handleKey(keyResult);
            }
        });
    },

    doCalculateKey (lassoContext) {
        if (this.isPackageDependency()) {
            return this.calculateKeyFromProps();
        } else if (this.isExternalResource()) {
            const url = this.getUrl ? this.getUrl(lassoContext) : this.url;
            return url;
        } else {
            if (lassoContext.cache) {
                return this.getLastModified(lassoContext)
                    .then((lastModified) => {
                        if (!lastModified) {
                            return doCalculateFingerprint(this, lassoContext);
                        }

                        return lassoContext.cache.getDependencyFingerprint(
                            // cache key
                            this.getPropsKey(),
                            // last modified timestamp (if cache entry is older than this then builder will be called)
                            lastModified,
                            // builder
                            doCalculateFingerprint.bind(null, this, lassoContext));
                    });
            } else {
                return doCalculateFingerprint(this, lassoContext);
            }
        }
    },

    calculateKeyFromProps: function() {
        var key = this._getKeyPropertyNames()
            .map(function(k) {
                return k + '=' + this[k];
            }, this)
            .join('|');

        return this.type + '|' + key;
    },

    hasContent: function() {
        return this.contentType !== CONTENT_TYPE_NONE;
    },

    isJavaScript: function() {
        return this.contentType === CONTENT_TYPE_JS;
    },

    isStyleSheet: function() {
        return this.contentType === CONTENT_TYPE_CSS;
    },

    getSlot: function() {
        if (this.slot) {
            return this.slot;
        }

        if (this.isStyleSheet()) {
            return this.getStyleSheetSlot();
        } else {
            return this.getJavaScriptSlot();
        }
    },

    hasModifiedFingerprint: function() {
        return false;
    },

    getContentType: function() {
        return this.contentType;
    },

    isCompiled: function() {
        return false;
    },

    isInPlaceDeploymentAllowed: function() {
        return this.type === 'js' || this.type === 'css';
    },

    isExternalResource: function() {
        return false;
    },

    getJavaScriptSlot: function() {
        return this['js-slot'] || this.slot;
    },

    getStyleSheetSlot: function() {
        return this['css-slot'] || this.slot;
    },

    async getLastModified (lassoContext) {
        if (this._lastModifiedValue) {
            return this._lastModifiedValue;
        }

        const getLastModified = (lastModified) =>
            lastModified == null || lastModified < 0 ? 0 : lastModified;

        const lastModified = this._lastModifiedValue =
            getLastModified(await this.doGetLastModified(lassoContext));

        return lastModified;
    },

    async doGetLastModified (lassoContext, callback) {
        const sourceFile = this.getSourceFile();
        if (sourceFile) {
            return this.getFileLastModified(sourceFile);
        } else {
            return 0;
        }
    },

    async getFileLastModified (path) {
        return lastModified.forFile(path);
    },

    createPackageManifest: function(manifest, dirname, filename) {
        var LassoManifest = require('../LassoManifest');

        if (Array.isArray(manifest) || !manifest) {
            manifest = {
                dependencies: manifest || []
            };
        } else {
            dirname = manifest.dirname;
            filename = manifest.filename;
        }

        return new LassoManifest({
            manifest: manifest,
            dependencyRegistry: this.__dependencyRegistry,
            dirname: dirname || this.getParentManifestDir(),
            filename: filename || this.getParentManifestPath()
        });
    },

    getDir: function() {
        var sourceFile = this.getSourceFile();
        // if (!sourceFile) {
        //     throw new Error('Unable to determine directory that dependency is associated with because getSourceFile() returned null and getDir() is not implemented. Dependency: ' + this.toString());
        // }
        return (sourceFile) ? nodePath.dirname(sourceFile) : null;
    },

    getSourceFile: function() {
        return null;
    },

    toString() {
        var entries = [];
        var type = this.type;

        for (var k in this) {
            if (this.hasOwnProperty(k) && !k.startsWith('_') && k !== 'type') {
                var v = this[k];
                entries.push(k + '=' + JSON.stringify(v));
            }
        }

        // var packagePath = this.getParentManifestPath();
        // if (packagePath) {
        //     entries.push('packageFile="' + packagePath + '"');
        // }

        return '[' + type + (entries.length ? (': ' + entries.join(', ')) : '') + ']';
    },

    shouldCache: function(lassoContext) {
        var cacheable = true;
        var isStatic = false;

        var cacheConfig = this.cacheConfig;
        if (cacheConfig) {
            cacheable = cacheConfig.cacheable !== false;
            isStatic = cacheConfig.static === true;
        } else {
            cacheable = this.cache !== false;
        }

        if (isStatic) {
            var transformer = lassoContext.transformer;
            if (!transformer || transformer.hasTransforms() === false) {
                // Don't bother caching a dependency if it is static and there are no transforms
                return false;
            }
        }

        return cacheable;
    },

    emit: function() {
        if (!this._events) {
            // No listeners
            return;
        }

        return this._events.emit.apply(this._events, arguments);
    },

    on: function(event, listener) {
        if (!this._events) {
            this._events = new EventEmitter();
        }

        return this._events.on(event, listener);
    },

    once: function(event, listener) {
        if (!this._events) {
            this._events = new EventEmitter();
        }

        return this._events.once(event, listener);
    },

    removeListener: function(event, listener) {
        if (!this._events) {
            // Nothing to remove
            return;
        }

        return this._events.removeListener.apply(this._events, arguments);
    },

    removeAllListeners: function(event) {
        if (!this._events) {
            // Nothing to remove
            return;
        }

        return this._events.removeAllListeners.apply(this._events, arguments);
    },

    getDefaultBundleName: function(pageBundleName, lassoContext) {
        return this.defaultBundleName;
    },

    inspect: function() {
        var inspected = {
            type: this.type
        };

        this._getKeyPropertyNames()
            .forEach((k) => {
                inspected[k] = this[k];
            });

        return inspected;
    }
};

Dependency.prototype.addListener = Dependency.prototype.on;

module.exports = Dependency;
