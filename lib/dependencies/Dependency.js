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
    this._keyPromise = undefined;

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

    readStream: function(context) {

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

        var input = this.read(context, callback);

        if (input == null) {
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
                            v = "true" === v;
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

    getPackageManifest: function(context) {
        if (!this.isPackageDependency()) {
            throw new Error('getPackageManifest() failed. Dependency is not a package: ' + this.toString());
        }

        var _this = this;
        var manifest = this._resolvedManifest;
        if (manifest) {
            return manifest;
        }

        var deferred = raptorPromises.defer();

        function callback(err, dependencies) {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve(dependencies);
        }

        if (typeof this.loadPackageManifest === 'function') {
            manifest = this.loadPackageManifest(context, callback);
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
                            return new OptimizerManifest(
                                manifest,
                                dependencyRegistry,
                                _this.getParentManifestDir(),
                                _this.getParentManifestPath());
                        } else {
                            return manifest;
                        }
                    } else {
                        return manifest;
                    }
                });
        }
        else if (typeof this.getDependencies === 'function') {

            var dependencies = this.getDependencies(context);
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


    calculateKey: function(context) {
        
        if (this._keyPromise === undefined) {
            var _this = this;
            this._keyPromise = raptorPromises.makePromise(this.doCalculateKey(context))
                .then(function(key) {
                    _this._key = key;
                    return key;
                });
        }

        return this._keyPromise;
        
    },

    doCalculateKey: function(context) {
        if (this.isPackageDependency()) {
            return this.calculateKeyFromProps();
        } else if (this.isExternalResource()) {
            return this.getUrl ? this.getUrl() : this.url;
        } else {
            var _this = this;
            var doCalculateChecksum = function(context) {
                
                var deferred = raptorPromises.defer();
                var input = _this.readStream(context);
                checksumStream.calculate(input, {pause: false})
                    .on('checksum', function(checksum) {
                        deferred.resolve(checksum);
                    })
                    .on('error', function(e) {
                        deferred.reject(e);
                    });

                return deferred.promise;
            };

            if (context.cache) {
                var lastModified = raptorPromises.makePromise(this.lastModified(context));
                return lastModified
                    .then(function(lastModified) {
                        return context.cache.getDependencyChecksum(
                            _this.getPropsKey(), 
                            lastModified,
                            function() {
                                return doCalculateChecksum();
                            });        
                    });
                
            } else {
                return doCalculateChecksum();
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

    lastModified: function() {
        if (typeof this.getSourceFile === 'function') {
            var sourceFile = this.getSourceFile();
            if (sourceFile) {
                return this.resourceLastModified(sourceFile);
            }
        }

        return -1;
    },

    resourceLastModified: function(path) {
        var deferred = raptorPromises.defer();

        fs.stat(path, function(err, stat) {
            if (err) {
                deferred.reject(err);
                return;
            }
            
            deferred.resolve(stat.mtime.getTime());
        });

        return deferred.promise;
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

        return new OptimizerManifest(manifest,
            this.__dependencyRegistry,
            dirname || this.getParentManifestDir(),
            filename || this.getParentManifestPath());
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