require('raptor-ecma/es6');
var nodePath = require('path');
var extend = require('raptor-util').extend;
var inherits = require('raptor-util').inherits;
var Dependency = require('./Dependency');
var CONTENT_TYPE_CSS = require('../content-types').CSS;
var CONTENT_TYPE_JS = require('../content-types').JS;
var ok = require('assert').ok;

function DEFAULT_NORMALIZER(dependency) {
    if (typeof dependency === 'string') {
        dependency = {
            path: dependency
        };
    }
    
    if (!dependency.type) {
        // the dependency doesn't have a type so try to infer it from the path
        if (dependency.path) {
            var type = this.typeForPath(dependency.path);
            if (!type) {
                dependency.type = 'package';
            }
            else {
                dependency.type = type;
            }
        }
        else if (dependency.hasOwnProperty('package')) {
            dependency.type = "package";
            dependency.path = dependency.package;
            delete dependency.package;
        }
    }
    return dependency;
}

function DependencyRegistry() {
    this.registeredTypes = {};
    this.extensions = {};
    this.normalizers = [DEFAULT_NORMALIZER.bind(this)];
    this.registerDefaults();
}

DependencyRegistry.prototype = {
    __DependencyRegistry: true,

    registerDefaults: function() {
        this.registerStyleSheetType('css', require('./dependency-resource'));
        this.registerJavaScriptType('js', require('./dependency-resource'));
        this.registerJavaScriptType('loader-metadata', require('./dependency-loader-metadata'));
        this.registerPackageType('package', require('./dependency-package'));
    },

    typeForPath: function(path) {
        // Find the type from the longest matching file extension.
        // For example if we are trying to infer the type of "jquery-1.8.3.js" then we will try:
        // a) "8.3.js"
        // b) "3.js"
        // c) "js"
        path = nodePath.basename(path);

        var dotPos = path.indexOf('.');

        if (dotPos === -1) {
            return null;
        }

        var type;
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

        mixins = extend({}, mixins);

        var properties = mixins.properties || {};
        var childProperties = Object.create(Dependency.prototype.properties);
        extend(childProperties, properties);
        mixins.properties = childProperties;

        var _this = this;

        function Ctor(dependencyConfig, dirname, filename) {
            this.__dependencyRegistry = _this;
            Dependency.call(this, dependencyConfig, dirname, filename);
        }

        inherits(Ctor, Dependency);

        extend(Ctor.prototype, mixins);
        
        if (!Ctor.prototype.getDir) {
            throw new Error('Dependency of type "' + type + '" is missing required getDir() method.');
        }
        
        var hasReadFunc = Ctor.prototype.read;
        
        if (isPackageDependency && hasReadFunc) {
            throw new Error('Manifest dependency of type "' + type + '" is not expected to have a read() method.');
        }
        else if (!isPackageDependency && !hasReadFunc) {
            throw new Error('Code dependency of type "' + type + '" is required to have a read() method.');
        }

        this.registeredTypes[type] = Ctor;
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

    registerExtension: function(ext, type) {
        this.extensions[ext] = type;
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