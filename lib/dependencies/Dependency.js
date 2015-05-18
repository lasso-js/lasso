var nodePath = require('path');
var condition = require('../condition');
var resolveFrom = require('resolve-from');

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
var cachingFs = require('../caching-fs');
var isAbsolute = require('../path').isAbsolute;

var NON_KEY_PROPERTIES = {
    inline: true,
    slot: true,
    'js-slot': true,
    'css-slot': true
};

function getPackagePath(d) {
    return d.__filename ? d.__filename : '(unknown)';
}

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

    this._initAsyncValue = undefined;
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

/**
 * This function provides provides an implementation that is used by
 * Dependency.prototype.resolvePath and Dependency.prototype.requireResolvePath.
 * These functions will now use the same machenism for resolving paths which
 * will work as follows:
 *
 * If path starts with "." then resolve as relative path.
 * If path starts with "/" then path is absolute and has been resolved already.
 * Otherwise, try to resolve path using NodeJS module search path convention
 * and if that fails fallback to using relative path resolution.
 */
function Dependency_resolvePath(path, from) {
    // NOTE: "this" is the Dependency
    var dependency = this;

    if (!from) {
        from = dependency.__dirname;
    }

    var firstChar = path.charAt(0);
    if (firstChar === '.') {
        // path is relative to dependency directory
        return nodePath.resolve(from, path);
    } else if (isAbsolute(path)) {
        // path is absolute
        return path;
    } else {
        // path should be resolved using require.resolve() convention first
        // and attempt relative path resolution if that fails
        try {
            return resolveFrom(from, path);
        } catch(e) {
            // Not bothering to check error code since serverResolveRequire
            // should only throw error for one reason which is "module not found".
            // if (e.code === 'MODULE_NOT_FOUND') {
            //
            // }
            var resolvedPath = nodePath.resolve(from, path);

            // Since the path looked like it was for a module we should check
            // to see if the fallback technique actually found a file. If file
            // does not exist for fallback path, then we'll report an error
            // that the module does not exist by re-throwing the original error.
            if (cachingFs.existsSync(resolvedPath)) {
                // Fallback technique found the path.
                // We might want to log something here to suggest that relative
                // paths be prefixed with "." to avoid the extra work of trying to
                // resolve path using NodeJS module search path.
            } else {
                // Path is not a module or resolved path.
                // Since the path did not start with a "." let's
                // throw the error that we caught when trying to
                // resolve as module
                throw new Error('Failed to resolve path "' + path + '". Target file does not exist. Started search from directory "' + from + '".');
            }

            // We were able to r
            return resolvedPath;
        }
    }
}

Dependency.prototype = {
    __Dependency: true,

    properties: {
        'type':             'string',
        'inline':           'string',
        'slot':             'string',
        'css-slot':         'string',
        'js-slot':          'string',
        'if':               'string',
        'if-extension':     'string', /* DEPRECRATED */
        'if-not-extension': 'string', /* DEPRECRATED */
        'if-flag':          'string',
        'if-not-flag':      'string'
    },

    init: function(lassoContext, callback) {
        equal(typeof callback, 'function', 'callback function is required');

        if (this._initAsyncValue) {
            return this._initAsyncValue.done(callback);
        }

        var initAsyncValue = this._initAsyncValue = new AsyncValue();
        this._initAsyncValue.done(callback);

        if (this.doInit.length === 0) {
            this.doInit();
            this._initAsyncValue.resolve();
        } else {
            this.doInit(lassoContext, function(err) {
                if (err) {
                    initAsyncValue.reject(err);
                } else {
                    initAsyncValue.resolve();
                }
            });
        }
    },

    doInit: function(lassoContext, callback) {
        callback();
    },

    read: function(lassoContext) {
        if (this._cachingReadStream) {
            return this._cachingReadStream.createReplayStream();
        }

        return this.doRead(lassoContext);
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
                            v = ('true' === v);
                        }
                        else if (type === 'int' || type === 'integer') {
                            v = parseInt(v, 10);
                        }
                        else if (type === 'float' || type === 'number') {
                            v = parseFloat(v);
                        }
                        else if (type === 'path') {
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
    resolvePath: Dependency_resolvePath,

    /**
     * @deprecated use resolvePath instead which has the same implementation
     * (this is here for backward compatibility)
     */
    requireResolvePath: Dependency_resolvePath,

    getParentManifestDir: function() {
        return this.__dirname;
    },

    getParentManifestPath: function() {
        return this.__filename;
    },

    isPackageDependency: function() {
        return this._packageDependency === true;
    },

    onAddToPageBundle: function(bundle, lassoContext) {
        // subclasses can override
    },

    onAddToAsyncPageBundle: function(bundle, lassoContext) {
        // subclasses can override
    },

    getPackageManifest: function(lassoContext, callback) {
        if (!this.isPackageDependency()) {
            throw new Error('getPackageManifest() failed. Dependency is not a package: ' + this.toString());
        }

        if (this._manifestAsyncValue) {
            this._manifestAsyncValue.done(callback);
            return;
        }

        var _this = this;

        var manifestAsyncValue;
        this._manifestAsyncValue = manifestAsyncValue = new AsyncValue();
        manifestAsyncValue.done(callback);

        if (typeof this.loadPackageManifest === 'function') {
            this.loadPackageManifest(lassoContext, function(err, result) {
                if (err) {
                    return manifestAsyncValue.reject(err);
                }

                if (!result) {
                    return manifestAsyncValue.resolve(null);
                }

                var dependencyRegistry = _this.__dependencyRegistry;
                var LassoManifest = require('../LassoManifest');
                var manifest;

                if (typeof result === 'string') {
                    var manifestPath = result;
                    var from = _this.getParentManifestDir();

                    try {
                        manifest = _this.createPackageManifest(manifestLoader.load(manifestPath, from));
                    } catch(e) {
                        var err;
                        if (e.fileNotFound) {
                            err = new Error('Lasso manifest not found for path "' +
                                manifestPath + '" (searching from "' + from + '"). Dependency: ' +
                                this.toString());
                        } else {
                            err = new Error('Unable to load lasso manifest for path "' +
                                manifestPath + '". Dependency: ' + _this.toString() + '. Exception: ' +
                                (e.stack || e));
                        }
                        callback(err);
                    }
                } else if (!LassoManifest.isLassoManifest(result)) {
                    manifest = new LassoManifest({
                        manifest: result,
                        dependencyRegistry: dependencyRegistry,
                        dirname: _this.getParentManifestDir(),
                        filename: _this.getParentManifestPath()
                    });
                } else {
                    manifest = result;
                }

                manifestAsyncValue.resolve(manifest);
            });
        } else if (typeof this.getDependencies === 'function') {
            this.getDependencies(lassoContext, function(err, dependencies) {
                if (err) {
                    return manifestAsyncValue.reject(err);
                }

                var manifest = null;
                if (dependencies) {
                    manifest = _this.createPackageManifest(dependencies);
                }

                manifestAsyncValue.resolve(manifest);
            });
        } else {
            var err = new Error('getPackageManifest() failed. "getDependencies" or "loadPackageManifest" expected: ' + this.toString());
            callback(err);
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

    getReadCacheKey: function() {
        return this.getPropsKey();
    },

    getPropsKey: function() {
        return this._propsKey || (this._propsKey = this.calculateKeyFromProps());
    },

    calculateKey: function(lassoContext, callback) {
        ok(typeof callback === 'function', 'callback is required');

        if (this._key !== undefined) {
            return callback(null, this._key);
        }

        if (this._keyAsyncValue) {
            // Attach a listener to the current in-progres check
            return this._keyAsyncValue.done(callback);
        }

        var _this = this;

        // no data holder so let's create one
        var keyAsyncValue;
        this._keyAsyncValue = keyAsyncValue = new AsyncValue();
        _this._keyAsyncValue.done(callback);

        var key = this.doCalculateKey(lassoContext, function(err, key) {
            if (err) {
                keyAsyncValue.reject(err);
                return;
            }

            if (logger.isDebugEnabled()) {
                logger.debug('Calculated key for ' + _this.toString() + ': ' + key);
            }

            if (typeof key !== 'string') {
                keyAsyncValue.reject(new Error('Invalid key: ' + key));
            }

            keyAsyncValue.resolve(key);
        });

        // if doCalculateKey returned value synchronously and did not
        // call the callback then resolve key
        if ((key !== undefined) && !keyAsyncValue.isSettled()) {
            keyAsyncValue.resolve(key);
        }
    },


    doCalculateKey: function(lassoContext, callback) {
        if (this.isPackageDependency()) {
            callback(null, this.calculateKeyFromProps());
        } else if (this.isExternalResource()) {
            var url = this.getUrl ? this.getUrl(lassoContext) : this.url;
            callback(null, url);
        } else {
            var _this = this;

            var doCalculateFingerprint = function(callback) {
                var input = _this.read(lassoContext);
                var cachingReadStream = util.createCachingStream();

                var fingerprintStream = util.createFingerprintStream()
                    .on('error', callback)
                    .on('fingerprint', function(fingerprint) {
                        _this._cachingReadStream = cachingReadStream;
                        if (logger.isDebugEnabled()) {
                            logger.debug('Dependency ' + _this.toString() + ' fingerprint key: ' + fingerprint);
                        }
                        callback(null, fingerprint);
                    });

                // Don't buffer the data so that the stream can be drained
                fingerprintStream.resume();

                input
                    .on('error', function(e) {
                        var message = 'Unable to read dependency "' + _this + '" referenced in "' + _this.getParentManifestPath() + '". ';
                        if (e.code === 'ENOENT' && e.path) {
                            message += 'File does not exist: ' + e.path;
                        } else {
                            message += 'Error: ' + (e.stack || e);
                        }
                        e = new Error(message);
                        e.dependency = _this;
                        callback(e);
                    })
                    .pipe(cachingReadStream)
                    .pipe(fingerprintStream);
            };

            if (lassoContext.cache) {
                this.getLastModified(lassoContext, function(err, lastModified) {

                    if (err) {
                        return callback(err);
                    }

                    if (!lastModified) {
                        doCalculateFingerprint(callback);
                        return;
                    }

                    lassoContext.cache.getDependencyFingerprint(
                        // cache key
                        _this.getPropsKey(),

                        // last modified timestamp (if cache entry is older than this then builder will be called)
                        lastModified,

                        // builder
                        doCalculateFingerprint,

                        // callback when fingerprint is found
                        callback);
                });
            } else {
                doCalculateFingerprint(callback);
            }
        }
    },

    calculateKeyFromProps: function() {
        var key = this._getKeyPropertyNames()
            .map(function(k) {
                return k+'=' + this[k];
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
        }
        else {
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

    getLastModified: function(lassoContext, callback) {
        ok(typeof callback === 'function', 'callback is required');

        if (this._lastModifiedAsyncValue) {
            // Attach a listener to the current in-progres check
            return this._lastModifiedAsyncValue.done(callback);
        }

        var lastModifiedAsyncValue = this._lastModifiedAsyncValue = new AsyncValue();
        lastModifiedAsyncValue.done(callback);

        var lastModified = this.doGetLastModified(lassoContext, function(err, lastModified) {
            if (err) {
                lastModifiedAsyncValue.reject(err);
            } else {
                lastModifiedAsyncValue.resolve(lastModified == null || lastModified < 0 ? 0 : lastModified);
            }
        });

        if ((lastModified !== undefined) && !lastModifiedAsyncValue.isSettled()) {
            // if doGetLastModified returned value synchronously and did not
            // call the callback then resolve key
            lastModifiedAsyncValue.resolve(lastModified == null || lastModified < 0 ? 0 : lastModified);
        }
    },

    doGetLastModified: function(lassoContext, callback) {
        var sourceFile = this.getSourceFile();
        if (sourceFile) {
            this.getFileLastModified(sourceFile, callback);
            return;
        } else {
            callback(null, 0);
        }
    },

    getFileLastModified: function(path, callback) {
        lastModified.forFile(path, callback);
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

    toString: function() {
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
    }
};

Dependency.prototype.addListener = Dependency.prototype.on;

module.exports = Dependency;
