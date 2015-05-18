var nodePath = require('path');
var extend = require('raptor-util').extend;
var inherit = require('raptor-util').inherit;
var Dependency = require('./Dependency');
var CONTENT_TYPE_CSS = require('../content-types').CSS;
var CONTENT_TYPE_JS = require('../content-types').JS;
var ok = require('assert').ok;
var typePathRegExp = /^([A-Za-z0-9_\-]{2,})\s*:\s*(.+)$/; // Hack: {2,} is used because Windows file system paths start with "c:\"
var readStream = require('../util').readStream;
var AsyncValue = require('raptor-async/AsyncValue');
var equal = require('assert').equal;
var globNormalizer = require('./glob').normalizer;

function defaultGetLastModified(path, lassoContext, callback) {
    lassoContext.getFileLastModified(path, callback);
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
                } else if (dependency.intersection) {
                    dependency.type = 'intersection';
                    dependency.dependencies = dependency.intersection;
                    delete dependency.intersection;
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
    this._normalizers = [];
    this._finalNormalizers = [];

    this.addNormalizer(createDefaultNormalizer(this));

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
        this.registerPackageType('intersection', require('./dependency-intersection'));
        this.registerExtension('browser.json', 'package');
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
            // is the actual filename. For example: "browser.json"
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
        this._normalizers.unshift(normalizerFunc);

        // Always run the glob normalizer first
        this._finalNormalizers = [globNormalizer].concat(this._normalizers);
    },
    registerType: function(type, mixins) {
        equal(typeof type, 'string', '"type" should be a string');
        equal(typeof mixins, 'object', '"mixins" should be a object');

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

            mixins.doRead = function(lassoContext) {
                var _this = this;
                return readStream(function(callback) {
                    return oldRead.call(_this, lassoContext, callback);
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
        equal(typeof ext, 'string', '"ext" should be a string');

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

        options.readStream = function(path, lassoContext) {
            return readStream(function(callback) {
                return read(path, lassoContext, callback);
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
     * https://github.com/lasso-js/lasso-marko/blob/master/lib/lasso-marko-plugin.js
     *
     *
     *
     * dependency that can be required. Howev
     * @param {String} type   The extension/type to register
     * @param {Object} mixins [description]
     */
    registerRequireType: function(type, mixins) {
        equal(typeof type, 'string', '"type" should be a string');
        equal(typeof mixins, 'object', '"mixins" should be a object');

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
        mixins.getDependencies = function(lassoContext, callback) {
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
                            return requireRead.call(_this, lassoContext, callback);
                        });
                    },
                    _requireGetLastModified: function(callback) {
                        if (requireGetLastModified) {
                            callback(null, -1);
                        } else {
                            requireGetLastModified.call(_this, lassoContext, callback);
                        }
                    }
                }
            ]);
        };

        this.registerPackageType(type, mixins);

        this.registerRequireExtension(type, {
            object: object,

            read: function(path, lassoContext) {
                var _this = {
                    path: path
                };

                return readStream(function(callback) {
                    return requireRead.call(_this, lassoContext, callback);
                });
            },
            getLastModified: function(path, lassoContext, callback) {
                var _this = {
                    path: path
                };

                return requireGetLastModified.call(_this, lassoContext, callback);
            }
        });
    },

    getRequireHandler: function(path, lassoContext) {
        ok(path, '"path" is required');
        ok(lassoContext, '"lassoContext" is required');

        ok(typeof path === 'string', '"path" should be a string');
        ok(typeof lassoContext === 'object', '"lassoContext" should be an object');

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

        var lastModifiedAsyncValue = null;

        return {
            object: requireExt.object === true,

            reader: function() {
                return readStream(path, lassoContext);
            },

            getLastModified: function(callback) {
                if (lastModifiedAsyncValue) {
                    return lastModifiedAsyncValue.done(callback);
                }

                lastModifiedAsyncValue = new AsyncValue();

                lastModifiedAsyncValue.done(callback);

                getLastModified(path, lassoContext, function(err, lastModified) {
                    if (err) {
                        return lastModifiedAsyncValue.reject(err);
                    }

                    lastModifiedAsyncValue.resolve(lastModified);
                });
            }
        };
    },

    registerJavaScriptType: function(type, mixins) {
        equal(typeof type, 'string', '"type" should be a string');
        equal(typeof mixins, 'object', '"mixins" should be a object');
        mixins.contentType = CONTENT_TYPE_JS;
        this.registerType(type, mixins);
    },

    registerStyleSheetType: function(type, mixins) {
        equal(typeof type, 'string', '"type" should be a string');
        equal(typeof mixins, 'object', '"mixins" should be a object');
        mixins.contentType = CONTENT_TYPE_CSS;
        this.registerType(type, mixins);
    },

    registerPackageType: function(type, mixins) {
        equal(typeof type, 'string', '"type" should be a string');
        equal(typeof mixins, 'object', '"mixins" should be a object');
        mixins._packageDependency = true;
        this.registerType(type, mixins);
    },

    registerExtension: function(extension, type) {
        equal(typeof extension, 'string', '"extension" should be a string');
        equal(typeof type, 'string', '"type" should be a string');
        this.extensions[extension] = type;
    },

    getType: function(type) {
        return this.registeredTypes[type];
    },

    createDependency: function(config, dirname, filename) {
        ok(config, '"config" is required');
        ok(dirname, '"dirname" is required');
        equal(typeof config, 'object', 'Invalid dependency: ' + require('util').inspect(config));

        var type = config.type;
        var Ctor = this.registeredTypes[type];
        if (!Ctor) {
            throw new Error('Dependency of type "' + type + '" is not supported. (dependency=' + require('util').inspect(config) + ', package="' + filename + '"). Registered types:\n' + Object.keys(this.registeredTypes).join(', '));
        }

        return new Ctor(config, dirname, filename);
    },

    _normalizeDependency: function(dependency, dirname, filename, callback) {
        ok(typeof callback === 'function', 'callback function expected');

        var i=-1;
        var normalizers = this._finalNormalizers;
        var normalizerCount = normalizers.length;

        var context = {
            dirname: dirname,
            filename: filename
        };

        function applyNextNormalizer() {
            if (++i === normalizerCount) {
                return callback(null, dependency);
            }

            var normalizeFunc = normalizers[i];
            if (normalizeFunc.length === 3) {
                // Asynchronous normalizer
                normalizeFunc(dependency, context, function (err, d) {
                    if (err) {
                        return callback(err);
                    }

                    dependency = d || dependency;

                    if (Array.isArray(dependency)) {
                        return callback(null, dependency);
                    }

                    applyNextNormalizer();
                });
            } else {
                // Synchronous normalizer
                dependency = normalizeFunc(dependency, context) || dependency;
                if (Array.isArray(dependency)) {
                    return callback(null, dependency);
                }

                applyNextNormalizer();
            }
        }

        applyNextNormalizer();
    },

    normalizeDependencies: function(dependencies, dirname, filename, callback) {
        ok(typeof callback === 'function', 'callback function expected');

        var i=-1;
        dependencies = dependencies.concat([]);
        var _this = this;

        function normalizeNext() {
            i++;
            if (i === dependencies.length) {
                return callback(null, dependencies);
            }

            var dependency = dependencies[i];

            if (dependency.__Dependency) {
                // Already normalized
                return normalizeNext();
            }

            _this._normalizeDependency(dependency, dirname, filename, function(err, dependency) {
                if (err) {
                    return callback(err);
                }

                if (Array.isArray(dependency)) {
                    var newDependencies = dependency;
                    dependencies.splice.apply(dependencies, [i, 1 /* remove one */].concat(newDependencies));
                    // Normalize again at the same index since we replaced the old dependency
                    // with an array of new dependencies
                    i--;
                } else {
                    dependencies[i] = _this.createDependency(dependency, dirname, filename);
                }

                normalizeNext();
            });
        }

        normalizeNext();
    }

};

module.exports = DependencyRegistry;
