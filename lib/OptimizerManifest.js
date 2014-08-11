var extend = require('raptor-util').extend;
var DependencyList = require('./DependencyList');
var ok = require('assert').ok;

var nodePath = require('path');
var ExtensionSet = require('./ExtensionSet');
var nextId = 0;

function OptimizerManifest(options) {

    var dependencyRegistry = options.dependencyRegistry;
    var dirname = options.dirname;
    var filename = options.filename;

    ok(dependencyRegistry, '"dependencyRegistry" is required');
    ok(dirname, '"dirname" is required');
    ok(typeof dirname === 'string', '"dirname" must be a string');

    var async;

    if (options.manifest) {
        // save off the async property value
        async = options.manifest.async;

        extend(this, options.manifest);
    }
    
    this._uniqueId = nextId++;

    this.dirname = dirname;
    this.filename = filename;
    
    this.dependencies = new DependencyList(
        this.dependencies || [],
        dependencyRegistry,
        this.dirname,
        this.filename,
        options.asyncPackageName);

    this.async = null;

    if (async) {
        if (typeof async !== 'object') {
            throw new Error('async should be an object. (dirname=' + dirname + ', filename=' + filename + ')');
        }

        this.async = {};

        for (var asyncPackageName in async) {
            if (async.hasOwnProperty(asyncPackageName)) {
                var asyncDependencies = async[asyncPackageName];
                this.async[asyncPackageName] = new DependencyList(
                    asyncDependencies,
                    dependencyRegistry,
                    this.dirname,
                    this.filename,
                    asyncPackageName);
            }
        }
    }
}

OptimizerManifest.prototype = {
    __OptimizerManifest: true,
    
    getUniqueId: function() {
        return this._uniqueId;
    },

    resolve: function(relPath) {
        return nodePath.resolve(this.dirname, relPath);
    },

    /**
     *
     * @param options
     * @returns
     */
    forEachDependency: function(options) {
         
        if (typeof options === 'function') {
            options = {
                callback: arguments[0],
                thisObj: arguments[1]
            };
            
            if (arguments[2]) {
                extend(options, arguments[2]);
            }
        }
        
        if (!options) {
            options = {};
        }

        var enabledExtensions = options.enabledExtensions;
        if (!enabledExtensions || !enabledExtensions.__ExtensionSet) {
            enabledExtensions = new ExtensionSet(enabledExtensions);
        }

        var callback = options.callback;
        var thisObj = options.thisObj;
        
        // TODO: Does this need to be put in a function?
        function _handleDependencies(dependencies, extension) {
            dependencies.forEach(function(dependency) {
                
                if (dependency._condition && !dependency._condition(enabledExtensions)) {
                    return;
                }
                   
                callback.call(thisObj, dependency.type, dependency, extension);
            });
        }
        
        _handleDependencies(this.dependencies, null); //Only process the regular dependencies if they are not filtered out
        
    }
};

OptimizerManifest.isOptimizerManifest = function(o) {
    return o && o.__OptimizerManifest;
};

module.exports = OptimizerManifest;