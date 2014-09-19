var nodePath = require('path');
var extend = require('raptor-util').extend;
var inherit = require('raptor-util').inherit;
var Dependency = require('./Dependency');
var CONTENT_TYPE_CSS = require('../content-types').CSS;
var CONTENT_TYPE_JS = require('../content-types').JS;
var ok = require('assert').ok;
var typePathRegExp = /^(\w+)\s*:\s*(.+)$/;
var readStream = require('../util').readStream;
var DataHolder = require('raptor-async/DataHolder');

function defaultGetLastModified(path, optimizerContext, callback) {
    optimizerContext.getFileLastModified(path, callback);
}

function createDefaultNormalizer(registry) {

    function parsePath(path) {
        var typePathMatches = typePathRegExp.exec(path);
        if (typePathMatches) {
            return {
                type: typePathMatches[1],
                path: typePathMatches[2]
            };
        } else {
            var type = registry.typeForPath(path);

            if (!type) {
                type = 'package';
            }

            return {
                type: type,
                path: path
            };
        }
    }

    return function(dependency) {
        if (typeof dependency === 'string') {
            dependency = parsePath(dependency);
        } else {
            // the dependency doesn't have a type so try to infer it from the path
            if (!dependency.type) {
                if (dependency.package) {
                    dependency.type = 'package';
                    dependency.path = dependency.package;
                    delete dependency.package;
                } else if (dependency.path) {
                    var parsed = parsePath(dependency.path);
                    dependency.type = parsed.type;
                    dependency.path = parsed.path;
                }
            }
        }
        return dependency;
    };
}

function DependencyRegistry() {
    this.registeredTypes = {};
    this.extensions = {};
    this.requireExtensions = {};
    this.normalizers = [createDefaultNormalizer(this)];
    this.registerDefaults();
    this.requireExtensions = {};
}

DependencyRegistry.prototype = {
    __DependencyRegistry: true,

    registerDefaults: function() {
        this.registerStyleSheetType('css', require('./dependency-resource'));
        this.registerJavaScriptType('js', require('./dependency-resource'));
        this.registerJavaScriptType('comment', require('./dependency-comment'));
        this.registerJavaScriptType('loader-metadata', require('./dependency-loader-metadata'));
        this.registerPackageType('package', require('./dependency-package'));
        this.registerExtension('optimizer.json', 'package');
    },

    typeForPath: function(path) {
        // Find the type from the longest matching file extension.
        // For example if we are trying to infer the type of "jquery-1.8.3.js" then we will try:
        // a) "8.3.js"
        // b) "3.js"
        // c) "js"
        path = nodePath.basename(path);

        var type = this.extensions[path];

        if (type) {
            // This is to handle the case where the extension
            // is the actual filename. For example: "optimizer.json"
            return type;
        }

        var dotPos = path.indexOf('.');
        if (dotPos === -1) {
            return null;
        }

        do {
            type = path.substring(dotPos + 1);
            if (this.extensions.hasOwnProperty(type)) {
                return this.extensions[type];
            }
            // move to the next dot position
            dotPos = path.indexOf('.', dotPos+1);
        }
        while(dotPos !== -1);

        var lastDot = path.lastIndexOf('.');
        return path.substring(lastDot+1);
    },

    addNormalizer: function(normalizerFunc) {
        ok(typeof normalizerFunc === 'function', 'function expected');
        this.normalizers.unshift(normalizerFunc);
    },
    registerType: function(type, mixins) {
        var isPackageDependency = mixins._packageDependency === true;

        var hasReadFunc = mixins.read;

        if (isPackageDependency && hasReadFunc) {
            throw new Error('Manifest dependency of type "' + type + '" is not expected to have a read() method.');
        }

        if (mixins.init) {
            mixins.doInit = mixins.init;
            delete mixins.init;
        }

        mixins = extend({}, mixins);

        var properties = mixins.properties || {};
        var childProperties = Object.create(Dependency.prototype.properties);
        extend(childProperties, properties);
        mixins.properties = childProperties;

        var calculateKey = mixins.calculateKey;
        if (calculateKey) {
            mixins.doCalculateKey = calculateKey;
            delete mixins.calculateKey;
        }

        var getLastModified = mixins.getLastModified || mixins.lastModified /* legacy */;
        if (getLastModified) {
            mixins.doGetLastModified = getLastModified;
            delete mixins.getLastModified;
            delete mixins.lastModified;
        }

        if (!isPackageDependency && mixins.read) {
            // Wrap the read method to ensure that it always returns a stream
            // instead of possibly using a callback
            var oldRead = mixins.read;
            delete mixins.read;

            mixins.doRead = function(optimizerContext) {
                var _this = this;
                return readStream(function(callback) {
                    return oldRead.call(_this, optimizerContext, callback);
                });
            };
        }


        var _this = this;

        function Ctor(dependencyConfig, dirname, filename) {
            this.__dependencyRegistry = _this;
            Dependency.call(this, dependencyConfig, dirname, filename);
        }

        inherit(Ctor, Dependency);

        extend(Ctor.prototype, mixins);

        this.registeredTypes[type] = Ctor;
    },

    registerRequireExtension: function(ext, options) {
        if (typeof options === 'function') {
            options = {
                read: options,
                getLastModified: defaultGetLastModified
            };
        } else {
            options = extend({}, options);
            if (!options.getLastModified) {
                options.getLastModified = defaultGetLastModified;
            }

            ok(options.read, '"read" function is required when registering a require extension');
            ok(typeof options.read === 'function', '"read" should be a function when registering a require extension');
        }

        options.object = options.object === true;

        var read = options.read;

        options.readStream = function(path, optimizerContext) {
            return readStream(function(callback) {
                return read(path, optimizerContext, callback);
            });
        };

        this.requireExtensions[ext] = options;
    },

    /**
     * In addition to registering a require extension using the "registerRequireExtension",
     * this method also registers a new dependency type with possibly additional properties.
     *
     * For example, if you just use "registerRequireExtension('foo', ...)", then only the following is supported:
     * - var foo = require('./hello.foo');
     * - "require: ./hello.foo"
     *
     * However, if you use registerRequireType with custom proeprties then all of the following are supported:
     * - var foo = require('./hello.foo');
     * - "require: ./hello.foo"
     * - "hello.foo",
     * - { "type": "foo", "path": "hello.foo", "hello": "world" }
     *
     * For an example, please see:
     * https://github.com/raptorjs3/optimizer-marko/blob/master/lib/optimizer-marko-plugin.js
     *
     *
     *
     * dependency that can be required. Howev
     * @param {String} type   The extension/type to register
     * @param {Object} mixins [description]
     */
    registerRequireType: function(type, mixins) {
        mixins = extend({}, mixins);

        var requireRead = mixins.read;
        var requireGetLastModified = mixins.getLastModified;
        var object = mixins.object === true;

        delete mixins.read;
        delete mixins.getLastModified;
        delete mixins.object;

        if (!mixins.getSourceFile) {
            mixins.getSourceFile = function() {
                return this.path;
            };
        }
        mixins.getDependencies = function(optimizerContext, callback) {
            /*
            We use the require dependency type since we are compiling Dust templates
            to CommonJS modules and they need to be wrapped for transport to the browser.
             */

            var _this = this;
            var path = this.path;

            callback(null, [
                {
                    type: 'require',
                    resolvedPath: path,
                    _requireIsObject: object,

                    _requireReader: function() {
                        return readStream(function(callback) {
                            return requireRead.call(_this, optimizerContext, callback);
                        });
                    },
                    _requireGetLastModified: function(callback) {
                        if (requireGetLastModified) {
                            callback(null, -1);
                        } else {
                            requireGetLastModified.call(_this, optimizerContext, callback);
                        }
                    }
                }
            ]);
        };

        this.registerPackageType(type, mixins);

        this.registerRequireExtension(type, {
            object: object,

            read: function(path, optimizerContext) {
                var _this = {
                    path: path
                };

                return readStream(function(callback) {
                    return requireRead.call(_this, optimizerContext, callback);
                });
            },
            getLastModified: function(path, optimizerContext, callback) {
                var _this = {
                    path: path
                };

                return requireGetLastModified.call(_this, optimizerContext, callback);
            }
        });
    },

    getRequireHandler: function(path, optimizerContext) {
        ok(path, '"path" is required');
        ok(optimizerContext, '"optimizerContext" is required');

        ok(typeof path === 'string', '"path" should be a string');
        ok(typeof optimizerContext === 'object', '"optimizerContext" should be an object');

        var basename = nodePath.basename(path);
        var lastDot = basename.lastIndexOf('.');
        var ext;
        if (lastDot === -1) {
            return null;
        }

        ext = basename.substring(lastDot+1);

        var requireExt = this.requireExtensions[ext];
        if (!requireExt) {
            return null;
        }

        var readStream = requireExt.readStream;
        var getLastModified = requireExt.getLastModified;

        var lastModifiedDataHolder = null;

        return {
            object: requireExt.object === true,

            reader: function() {
                return readStream(path, optimizerContext);
            },

            getLastModified: function(callback) {
                if (lastModifiedDataHolder) {
                    return lastModifiedDataHolder.done(callback);
                }

                lastModifiedDataHolder = new DataHolder();

                lastModifiedDataHolder.done(callback);

                getLastModified(path, optimizerContext, function(err, lastModified) {
                    if (err) {
                        return lastModifiedDataHolder.reject(err);
                    }

                    lastModifiedDataHolder.resolve(lastModified);
                });
            }
        };
    },

    registerJavaScriptType: function(type, mixins) {
        mixins.contentType = CONTENT_TYPE_JS;
        this.registerType(type, mixins);
    },

    registerStyleSheetType: function(type, mixins) {
        mixins.contentType = CONTENT_TYPE_CSS;
        this.registerType(type, mixins);
    },

    registerPackageType: function(type, mixins) {
        mixins._packageDependency = true;
        this.registerType(type, mixins);
    },

    registerExtension: function(extension, type) {
        ok(typeof extension === 'string', '"extension" argument should be a string.');
        ok(typeof type === 'string', '"type" argument should be a string');
        this.extensions[extension] = type;
    },

    getType: function(type) {
        return this.registeredTypes[type];
    },

    createDependency: function(config, dirname, filename) {
        if (!config) {
            throw new Error('"config" is required');
        }

        if (!dirname) {
            throw new Error('"dirname" is required');
        }

        config = this.normalizeDependency(config);
        if (typeof config !== 'object') {
            throw new Error('Invalid dependency: ' + require('util').inspect(config));
        }

        var type = config.type;
        var Ctor = this.registeredTypes[type];
        if (!Ctor) {
            throw new Error('Dependency of type "' + type + '" is not supported. (dependency=' + require('util').inspect(config) + ', package="' + filename + '"). Registered types:\n' + Object.keys(this.registeredTypes).join(', '));
        }

        return new Ctor(config, dirname, filename);
    },

    normalizeDependency: function(dependency) {
        for (var i=0, len=this.normalizers.length; i<len; i++) {
            var normalizeFunc = this.normalizers[i];
            dependency = normalizeFunc(dependency) || dependency;
        }

        return dependency;
    }

};

module.exports = DependencyRegistry;
