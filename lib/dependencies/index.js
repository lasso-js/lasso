require('raptor-ecma/es6');
var nodePath = require('path');
var extend = require('raptor-util').extend;
var inherits = require('raptor-util').inherits;
var Dependency = require('./Dependency');
var CONTENT_TYPE_CSS = require('../content-types').CSS;
var CONTENT_TYPE_JS = require('../content-types').JS;
var ok = require('assert').ok;

var registeredTypes = {};
var extensions = {};

function typeForPath(path) {
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
        if (extensions.hasOwnProperty(type)) {
            return extensions[type];
        }
        // move to the next dot position
        dotPos = path.indexOf('.', dotPos+1);
    }
    while(dotPos !== -1);

    var lastDot = path.lastIndexOf('.');
    return path.substring(lastDot+1);
}

var normalizers = [function(dependency) {
    if (typeof dependency === 'string') {
        dependency = {
            path: dependency
        };
    }
    
    if (!dependency.type) {
        // the dependency doesn't have a type so try to infer it from the path
        if (dependency.path) {
            var type = typeForPath(dependency.path);
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
}];

function addNormalizer(normalizerFunc) {
    ok(typeof normalizerFunc === 'function', 'function expected');
    normalizers.unshift(normalizerFunc);
}

function registerType(type, mixins) {
    var isPackageDependency = mixins._packageDependency === true;

    mixins = extend({}, mixins);

    var properties = mixins.properties || {};
    var childProperties = Object.create(Dependency.prototype.properties);
    extend(childProperties, properties);
    mixins.properties = childProperties;

    function Ctor(dependencyConfig, dirname, filename) {
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

    registeredTypes[type] = Ctor;
}

function registerJavaScriptType(type, mixins) {
    mixins.contentType = CONTENT_TYPE_JS;
    registerType(type, mixins);
}

function registerStyleSheetType(type, mixins) {
    mixins.contentType = CONTENT_TYPE_CSS;
    registerType(type, mixins);
}

function registerPackageType(type, mixins) {
    mixins._packageDependency = true;
    registerType(type, mixins);   
}

function registerExtension(ext, type) {
    extensions[ext] = type;
}

function getType(type) {
    return registeredTypes[type];
}

function createDependency(config, dirname, filename) {
    if (!config) {
        throw new Error('"config" is required');
    }

    if (!dirname) {
        throw new Error('"dirname" is required');
    }
    
    config = exports.normalizeDependency(config);
    if (typeof config !== 'object') {
        throw new Error('Invalid dependency: ' + require('util').inspect(config));
    }

    var type = config.type;
    var Ctor = registeredTypes[type];
    if (!Ctor) {
        throw new Error('Dependency of type "' + type + '" is not supported. (dependency of ' + require('util').inspect(config) + ' in package ' + filename + ')');
    }

    return new Ctor(config, dirname, filename);
}

function normalizeDependency(dependency) {
    for (var i=0, len=normalizers.length; i<len; i++) {
        var normalizeFunc = normalizers[i];
        dependency = normalizeFunc(dependency) || dependency;
    }
    
    return dependency;
}

registerStyleSheetType('css', require('./Dependency_resource'));
registerJavaScriptType('js', require('./Dependency_resource'));
registerJavaScriptType('loader-metadata', require('./Dependency_loader-metadata'));
registerPackageType('package', require('./Dependency_package'));

exports.Dependency = Dependency;

exports.createDependency = createDependency;
exports.getType = getType;
exports.registerJavaScriptType = registerJavaScriptType;
exports.registerStyleSheetType = registerStyleSheetType;
exports.registerPackageType = registerPackageType;
exports.registerExtension = registerExtension;
exports.addNormalizer = addNormalizer;
exports.normalizeDependency = normalizeDependency;

exports.toString = function () {
    return '[raptor-optimizer@' + __filename + ']';
};
