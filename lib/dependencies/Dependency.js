var fs = require('fs');
var nodePath = require('path');
var condition = require('../condition');
var DEFAULT_READ_FILE_OPTIONS = {encoding: 'utf8'};
var CONTENT_TYPE_CSS = require('../content-types').CSS;
var CONTENT_TYPE_JS = require('../content-types').JS;
var thenFS = require('then-fs');
var raptorPromises = require('raptor-promises');
var checksumStream = require('../checksum-stream');
var zeroPromise = raptorPromises.resolved(0);
var ok = require('assert').ok;

var NON_KEY_PROPERTIES = {
    inline: true,
    async: true,
    slot: true,
    'js-slot': true,
    'css-slot': true
};

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
        'inline':       'boolean',
        'slot':         'string',
        'css-slot':     'string',
        'js-slot':      'string',
        'if':           'string',
        'if-extension': 'string'
    },

    set: function(props) {

        var propertyTypes = this.properties;

        for (var k in props) {
            if (props.hasOwnProperty(k)) {
                
                var v = props[k];

                if (propertyTypes) {
                    var type = propertyTypes[k];
                    if (!type && !k.startsWith('_')) {
                        throw new Error('Dependency of type "' + this.type + '" does not support property "' + k + '"');
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

        if (typeof this.loadPackageManifest === 'function') {
            manifest = this.loadPackageManifest(context);
            manifest = raptorPromises.resolved(manifest)
                .then(function(manifest) {
                    var OptimizerManifest = require('../OptimizerManifest');
                    if (!OptimizerManifest.isOptimizerManifest(manifest)) {
                        return new OptimizerManifest(
                            manifest,
                            this.__dependencyRegistry,
                            _this.getParentManifestDir,
                            _this.getParentManifestPath);
                    }
                    else {
                        return manifest;
                    }
                });
        }
        else if (typeof this.getDependencies === 'function') {
            var dependencies = this.getDependencies(context);
            manifest = raptorPromises.resolved(dependencies)
                .then(function(dependencies) {
                    if (!Array.isArray(dependencies)) {
                        throw new Error('Dependnecies array expected: ' + dependencies);
                    }
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
            this._keyPromise = raptorPromises.resolved(this.doCalculateKey(context));
            this._keyPromise
                .then(function(key) {
                    _this._key = key;
                })
                .fail(function(e) {
                    _this._keyPromise = undefined;
                });
        }

        return this._keyPromise;
        
    },

    doCalculateKey: function(context) {
        if (this.isPackageDependency()) {
            return this.calculateKeyFromProps();
        }
        else {
            var _this = this;
            var doCalculateChecksum = function(context) {
                var deferred = raptorPromises.defer();
                var input = _this.read(context);
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

                return this.lastModified()
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

    isAsync: function() {
        return this.async === true;
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
        return zeroPromise;
    },

    resourceLastModified: function(path) {
        return thenFS.stat(path)
            .then(
                function(stat) {
                    return stat.mtime.getTime();
                },
                function(err) {
                    return -1;
                });
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

    toString: function() {
        var entries = [];
        var type = this.type;

        for (var k in this) {
            if (this.hasOwnProperty(k) && !k.startsWith('_') && k !== 'type') {
                var v = this[k];
                entries.push(k + '=' + JSON.stringify(v));
            }
        }

        return '[' + type + (entries.length ? (': ' + entries.join(', ')) : '') + ']';
    }
};

module.exports = Dependency;