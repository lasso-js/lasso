var fs = require('fs');
var nodePath = require('path');
var condition = require('../condition');
var DEFAULT_READ_FILE_OPTIONS = {encoding: 'utf8'};
var CONTENT_TYPE_CSS = require('../content-types').CSS;
var CONTENT_TYPE_JS = require('../content-types').JS;
var raptorPromises = require('raptor-promises');
var checksumStream = require('../checksum-stream');
var ok = require('assert').ok;
var eventStream = require('event-stream');
var raptorPromisesUtil = require('raptor-promises/util');
var manifestLoader = require('../manifest-loader');
var logger = require('raptor-logging').logger(module);
var lastModified = require('../last-modified');
var DataHolder = require('raptor-async/DataHolder');

var NON_KEY_PROPERTIES = {
    inline: true,
    slot: true,
    'js-slot': true,
    'css-slot': true
};

function getPackagePath(d) {
    return d.__filename ? d.__filename : '(unknown)';
}

function Dependency(dependencyConfig, dirname, filename) {
    ok(dependencyConfig != null, '"dependencyConfig" is a required argument');
    ok(typeof dependencyConfig === 'object', '"dependencyConfig" should be an object');
    
    ok(dirname, '"dirname" is a required argument');
    ok(typeof dirname, '"dirname" should be a string');


    this._key = undefined;
    this._keyDataHolder = undefined;

    this._lastModifiedValue = null;
    this._lastModifiedDataHolder = undefined;

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
        'recursive':    'boolean',
        'inline':       'string',
        'slot':         'string',
        'css-slot':     'string',
        'js-slot':      'string',
        'if':           'string',
        'if-extension': 'string'
    },

    readStream: function(optimizerContext) {
        var promise;
        var deferred;

        function callback(err, code) {
            deferred = deferred || raptorPromises.defer();
            if (err) {
                deferred.reject(err);
                return;
            }

            deferred.resolve(code);
        }

        var input = this.read(optimizerContext, callback);

        if (!input) {
            deferred = deferred || raptorPromises.defer();
            promise = deferred.promise;
        }
        
        if (typeof input === 'string') {
            var str = input;
            input = eventStream.through();
                input.pause();
                input.queue(str);
            input.end();
        } else if (raptorPromisesUtil.isPromise(input)) {
            promise = input;
            
        }

        if (promise) {
            input = eventStream.through();
            promise.then(
                function fulfilled(data) {
                    input.queue(data);
                    input.end();
                },
                function rejected(e) {
                    input.emit('error', e);
                    input.end();
                });
        }

        return input;
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

    getPackageManifest: function(optimizerContext, callback) {
        if (!this.isPackageDependency()) {
            throw new Error('getPackageManifest() failed. Dependency is not a package: ' + this.toString());
        }

        var _this = this;
        var manifest = this._resolvedManifest;
        if (!manifest) {
            var deferred = raptorPromises.defer();

            if (typeof this.loadPackageManifest === 'function') {
                manifest = this.loadPackageManifest(optimizerContext, function callback(err, dependencies) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                    deferred.resolve(dependencies);
                });

                if (manifest === undefined) {
                    manifest = deferred.promise;
                } else {
                    deferred.resolve(); // We started a deferred and even though it is not used we will resolve it
                }

                var dependencyRegistry = this.__dependencyRegistry;

                manifest = raptorPromises.makePromise(manifest)
                    .then(function(manifest) {
                        var OptimizerManifest = require('../OptimizerManifest');
                        if (manifest) {
                            if (typeof manifest === 'string') {
                                var manifestPath = manifest;
                                var from = _this.getParentManifestDir();

                                try {
                                    
                                    manifest = _this.createPackageManifest(
                                        manifestLoader.load(manifestPath, from));
                                    return manifest;
                                } catch(e) {
                                    if (e.fileNotFound) {
                                        throw new Error('Optimizer manifest not found for path "' + manifestPath + '" (searching from "' + from + '"). Dependency: ' + this.toString());
                                    }
                                    else {
                                        throw new Error('Unable to load optimizer manifest for path "' + manifestPath + '". Dependency: ' + _this.toString() + '. Exception: ' + (e.stack || e));
                                    }
                                }
                            } else if (!OptimizerManifest.isOptimizerManifest(manifest)) {
                                return new OptimizerManifest({
                                    optimizerManifest: manifest,
                                    dependencyRegistry: dependencyRegistry,
                                    dirname: _this.getParentManifestDir(),
                                    filename: _this.getParentManifestPath()
                                });
                            } else {
                                return manifest;
                            }
                        } else {
                            return manifest;
                        }
                    });
            }
            else if (typeof this.getDependencies === 'function') {

                var dependencies = this.getDependencies(optimizerContext);
                if (dependencies === undefined) {
                    dependencies = deferred.promise;
                } else {
                    deferred.resolve(); // We started a deferred and even though it is not used we will resolve it
                }

                manifest = raptorPromises.makePromise(dependencies)
                    .then(function(dependencies) {
                        return _this.createPackageManifest(dependencies);
                    });
            }
            else {
                throw new Error('getPackageManifest() failed. "getDependencies" or "loadPackageManifest" expected: ' + this.toString());
            }
            
            this._resolvedManifest = manifest;
        }

        if (callback) {
            manifest
                .then(function(manifest) {
                    callback(null, manifest);
                })
                .fail(callback);
        }
        return manifest;
    },

    _getKeyPropertyNames: function() {
        return Object.keys(this)
            .filter(function(k) {
                return !k.startsWith('_') && k !== 'type' && !NON_KEY_PROPERTIES.hasOwnProperty(k);
            }, this)
            .sort();
    },

    getKey: function() {
        return this._key;
    },

    getPropsKey: function() {
        return this._propsKey || (this._propsKey = this.calculateKeyFromProps());
    },


    calculateKey: function(optimizerContext, callback) {
        ok(typeof callback === 'function', 'callback is required');

        if (this._key != null) {
            return callback(null, this._key);
        }

        if (this._keyDataHolder) {
            // Attach a listener to the current in-progres check
            return this._keyDataHolder.done(callback);
        }

        var _this = this;

        this._key = this.doCalculateKey(optimizerContext, function(err, lastModified) {
            var lastModifiedDataHolder = _this._keyDataHolder || (_this._keyDataHolder = new DataHolder());

            if (err) {
                lastModifiedDataHolder.reject(err);
            } else {
                lastModifiedDataHolder.resolve(lastModified == null ? 0 : lastModified);
            }
            
        });

        if (this._key != null) {
            // The implementation for last modified may have returned a value synchronously...
            callback(null, this._key);
        } else {
            _this._keyDataHolder = _this._keyDataHolder || new DataHolder();
            _this._keyDataHolder.done(callback);
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
            var doCalculateChecksum = function(callback) {
                
                //console.log(module.id, 'doCalculateChecksum: ' + _this);
                
                var input = _this.readStream(optimizerContext);

                input.on('error', function(e) {
                        logger.error('Error calculating checksum', e);
                        callback(e);
                    })

                    .pipe(checksumStream())

                    .on('checksum', function(checksum) {
                        callback(null, checksum);
                    });
            };

            if (optimizerContext.cache) {
                this.lastModified(optimizerContext, function(err, lastModified) {
                    if (err) {
                        return callback(err);
                    }

                    if (lastModified <= 0) {
                        doCalculateChecksum(callback);
                        return;
                    }

                    optimizerContext.cache.getDependencyChecksum(
                        _this.getPropsKey(),
                        lastModified,
                        doCalculateChecksum,
                        callback);
                });
            } else {
                doCalculateChecksum(callback);
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

    hasModifiedChecksum: function() {
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

        if (this._lastModifiedValue != null) {
            return callback(null, this._lastModifiedValue);
        }

        if (this._lastModifiedDataHolder) {
            // Attach a listener to the current in-progres check
            return this._lastModifiedDataHolder.done(callback);
        }

        var _this = this;

        this._lastModifiedValue = this.doLastModified(optimizerContext, function(err, lastModified) {
            var lastModifiedDataHolder = _this._lastModifiedDataHolder || (_this._lastModifiedDataHolder = new DataHolder());

            if (err) {
                lastModifiedDataHolder.reject(err);
            } else {
                lastModifiedDataHolder.resolve(lastModified == null ? 0 : lastModified);
            }
            
        });

        if (this._lastModifiedValue != null) {
            // The implementation for last modified may have returned a value synchronously...
            callback(null, this._lastModifiedValue);
        } else {
            _this._lastModifiedDataHolder = _this._lastModifiedDataHolder || new DataHolder();
            _this._lastModifiedDataHolder.done(callback);
        }
    },

    doLastModified: function(optimizerContext, callback) {
        if (typeof this.getSourceFile === 'function') {
            var sourceFile = this.getSourceFile();
            if (sourceFile) {
                this.resourceLastModified(sourceFile, callback);
            }
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
        if (typeof this.getSourceFile === 'function') {
            var sourceFile = this.getSourceFile();
            if (!sourceFile) {
                throw new Error('Unable to determine directory that dependency is associated with because getSourceFile() returned null. Dependency: ' + this.toString());
            }
            return nodePath.dirname(sourceFile);
        } else {
            throw new Error('Unable to determine directory that dependency is associated with because neither getSourceFile() nor getDir() is implemented. Dependency: ' + this.toString());
        }

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
