var fs = require('fs');
var nodePath = require('path');
var condition = require('../condition');
var DEFAULT_READ_FILE_OPTIONS = {encoding: 'utf8'};
var CONTENT_TYPE_CSS = require('../content-types').CSS;
var CONTENT_TYPE_JS = require('../content-types').JS;
var CONTENT_TYPE_NONE = require('../content-types').NONE;
var util = require('../util');
var ok = require('assert').ok;
var Readable = require('stream').Readable;
var manifestLoader = require('../manifest-loader');
var logger = require('raptor-logging').logger(module);
var lastModified = require('../last-modified');
var DataHolder = require('raptor-async/DataHolder');
var DeferredReadable = require('../DeferredReadable');

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
    ok(typeof dependencyConfig === 'object', '"dependencyConfig" should be an object');

    ok(dirname, '"dirname" is a required argument');
    ok(typeof dirname, '"dirname" should be a string');

    this._keyDataHolder = undefined;
    this._lastModifiedDataHolder = undefined;
    this._cachingReadStream = undefined;

    this.__dirname = dirname;
    this.__filename = filename;

    this.type = dependencyConfig.type;

    if (dependencyConfig['if']) {
        this._condition = condition.fromExpression(dependencyConfig['if']);
    }
    else if (dependencyConfig['if-extension']) {
        this._condition = condition.fromExtension(dependencyConfig['if-extension']);
    }

    delete dependencyConfig['if'];
    delete dependencyConfig['if-extension'];

    this.set(dependencyConfig);

    if (this.init) {
        this.init(dirname, filename);
    }
}

Dependency.prototype = {
    __Dependency: true,

    properties: {
        'type':         'string',
        'inline':       'string',
        'slot':         'string',
        'css-slot':     'string',
        'js-slot':      'string',
        'if':           'string',
        'if-extension': 'string'
    },

    readStream: function(optimizerContext) {
        if (this._cachingReadStream) {
            return this._cachingReadStream.createReplayStream();
        }

        var self = this;

        // Calling read will do one of the following
        // 1) Return the actual value or null if there no data
        // 2) Invoke our callback with a value
        // 3) Return a stream
        var stream = new DeferredReadable(function() {
            // this function will be called when it is time to start reading data
            var finished = false;

            var onFinish = function(err, code) {
                if (finished) {
                    logger.warn(new Error('Dependency read callback invoked after finish'));
                    return;
                }

                // don't let onFinished be called again
                finished = true;

                if (err) {
                    stream.emit('error', err);
                    return;
                }

                // If code is not null and not undefined then push it to output stream
                if (code != null) {
                    // put the into the stream
                    stream.push(code);
                }

                // push null which is used to signal completion
                stream.push(null);
            };

            var  result = self.read(optimizerContext, onFinish);

            if (!finished) {
                // callback was not invoked
                if (result === null) {
                    // read function returned null which means that it has no data
                    finished = true;
                    stream.push(null);
                } else if (result === undefined) {
                    // waiting on callback
                } else if (result.pipe !== undefined) {
                    // data is stream
                    finished = true;

                    result.on('end', function() {
                        stream.push(null);
                    });

                    result.on('data', function(data) {
                        stream.push(data);
                    });

                    stream.on('pause', function() {
                        result.pause();
                    });

                    stream.on('resume', function() {
                        result.resume();
                    });

                    result.resume();
                } else {
                    // result is not a stream but we have some type of data so push it to the stream
                    finished = true;
                    stream.push(result);
                    stream.push(null);
                }
            }
        }, DEFAULT_READ_FILE_OPTIONS);

        return stream;
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

    resolvePath: function(path) {
        return nodePath.resolve(this.__dirname, path);
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

    onAddToPageBundle: function(bundle, optimizerContext) {
        // subclasses can override
    },

    onAddToAsyncPageBundle: function(bundle, optimizerContext) {
        // subclasses can override
    },

    getPackageManifest: function(optimizerContext, callback) {
        if (!this.isPackageDependency()) {
            throw new Error('getPackageManifest() failed. Dependency is not a package: ' + this.toString());
        }

        if (this._manifestDataHolder) {
            this._manifestDataHolder.done(callback);
            return;
        }

        var _this = this;

        var manifestDataHolder;
        this._manifestDataHolder = manifestDataHolder = new DataHolder();
        manifestDataHolder.done(callback);

        if (typeof this.loadPackageManifest === 'function') {
            this.loadPackageManifest(optimizerContext, function(err, result) {
                if (err) {
                    return manifestDataHolder.reject(err);
                }

                if (!result) {
                    return manifestDataHolder.resolve(null);
                }

                var dependencyRegistry = _this.__dependencyRegistry;
                var OptimizerManifest = require('../OptimizerManifest');
                var manifest;

                if (typeof result === 'string') {
                    var manifestPath = result;
                    var from = _this.getParentManifestDir();

                    try {
                        manifest = _this.createPackageManifest(manifestLoader.load(manifestPath, from));
                    } catch(e) {
                        var err;
                        if (e.fileNotFound) {
                            err = new Error('Optimizer manifest not found for path "' + manifestPath + '" (searching from "' + from + '"). Dependency: ' + this.toString());
                        } else {
                            err = new Error('Unable to load optimizer manifest for path "' + manifestPath + '". Dependency: ' + _this.toString() + '. Exception: ' + (e.stack || e));
                        }
                        callback(err);
                    }
                } else if (!OptimizerManifest.isOptimizerManifest(result)) {
                    manifest = new OptimizerManifest({
                        manifest: result,
                        dependencyRegistry: dependencyRegistry,
                        dirname: _this.getParentManifestDir(),
                        filename: _this.getParentManifestPath()
                    });
                } else {
                    manifest = result;
                }

                manifestDataHolder.resolve(manifest);
            });
        } else if (typeof this.getDependencies === 'function') {
            this.getDependencies(optimizerContext, function(err, dependencies) {
                if (err) {
                    return manifestDataHolder.reject(err);
                }

                var manifest = null;
                if (dependencies) {
                    manifest = _this.createPackageManifest(dependencies);
                }

                manifestDataHolder.resolve(manifest);
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
        if (!this._keyDataHolder || !this._keyDataHolder.isResolved()) {
            return null;
            // throw new Error('getKey() was called before key was calculated');
        }
        return this._keyDataHolder.data;
    },

    getPropsKey: function() {
        return this._propsKey || (this._propsKey = this.calculateKeyFromProps());
    },

    calculateKey: function(optimizerContext, callback) {
        ok(typeof callback === 'function', 'callback is required');

        if (this._key !== undefined) {
            return callback(null, this._key);
        }

        if (this._keyDataHolder) {
            // Attach a listener to the current in-progres check
            return this._keyDataHolder.done(callback);
        }

        var _this = this;

        // no data holder so let's create one
        var keyDataHolder;
        this._keyDataHolder = keyDataHolder = new DataHolder();
        _this._keyDataHolder.done(callback);

        var key = this.doCalculateKey(optimizerContext, function(err, key) {
            if (err) {
                keyDataHolder.reject(err);
                return;
            }

            if (logger.isDebugEnabled()) {
                logger.debug('Calculated key for ' + _this.toString() + ': ' + key);
            }

            if (typeof key !== 'string') {
                keyDataHolder.reject(new Error('Invalid key: ' + key));
            }

            keyDataHolder.resolve(key);
        });

        // if doCalculateKey returned value synchronously and did not
        // call the callback then resolve key
        if ((key !== undefined) && !keyDataHolder.isSettled()) {
            keyDataHolder.resolve(key);
        }
    },


    doCalculateKey: function(optimizerContext, callback) {
        if (this.isPackageDependency()) {
            callback(null, this.calculateKeyFromProps());
        } else if (this.isExternalResource()) {
            var url = this.getUrl ? this.getUrl(optimizerContext) : this.url;
            callback(null, url);
        } else {
            var _this = this;

            var doCalculateFingerprint = function(callback) {
                var input = _this.readStream(optimizerContext);
                var cachingReadStream = _this._cachingReadStream = util.createCachingStream();

                var fingerprintStream = util.createFingerprintStream();
                fingerprintStream.resume(); // Don't buffer the data so that the stream can be drained
                fingerprintStream.on('fingerprint', function(fingerprint) {

                    if (logger.isDebugEnabled()) {
                        logger.debug('Dependency ' + _this.toString() + ' fingerprint key: ' + fingerprint);
                    }
                    callback(null, fingerprint);
                });

                input.on('error', function(e) {
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

            if (optimizerContext.cache) {
                this.lastModified(optimizerContext, function(err, lastModified) {
                    if (err) {
                        return callback(err);
                    }

                    optimizerContext.cache.getDependencyFingerprint(
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

    readResource: function(path) {
        if (!path) {
            throw new Error('"path" is required');
        }

        path = this.resolvePath(path);
        return fs.createReadStream(path, DEFAULT_READ_FILE_OPTIONS);
    },

    lastModified: function(optimizerContext, callback) {
        ok(typeof callback === 'function', 'callback is required');

        if (this._lastModifiedDataHolder) {
            // Attach a listener to the current in-progres check
            return this._lastModifiedDataHolder.done(callback);
        }

        var lastModifiedDataHolder;
        this._lastModifiedDataHolder = lastModifiedDataHolder = new DataHolder();
        this._lastModifiedDataHolder.done(callback);

        var lastModified = this.doLastModified(optimizerContext, function(err, lastModified) {
            if (err) {
                lastModifiedDataHolder.reject(err);
            } else {
                lastModifiedDataHolder.resolve(lastModified == null ? 0 : lastModified);
            }
        });

        if ((lastModified !== undefined) && !lastModifiedDataHolder.isSettled()) {
            // if doLastModified returned value synchronously and did not
            // call the callback then resolve key
            lastModifiedDataHolder.resolve(lastModified);
        }
    },

    doLastModified: function(optimizerContext, callback) {
        var sourceFile = this.getSourceFile();
        if (sourceFile) {
            this.resourceLastModified(sourceFile, callback);
        } else {
            callback(null, -1);
        }
    },

    resourceLastModified: function(path, callback) {
        lastModified.forFile(path, callback);
    },

    createPackageManifest: function(manifest, dirname, filename) {
        var OptimizerManifest = require('../OptimizerManifest');

        if (Array.isArray(manifest) || !manifest) {
            manifest = {
                dependencies: manifest || []
            };
        } else {
            dirname = manifest.dirname;
            filename = manifest.filename;
        }

        return new OptimizerManifest({
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
    }
};

module.exports = Dependency;
