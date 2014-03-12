var extend = require('raptor-util').extend;
var DependencyList = require('./DependencyList');
var ok = require('assert').ok;

var nodePath = require('path');
var ExtensionSet = require('./ExtensionSet');
var nextId = 0;

function OptimizerManifest(optimizerManifest, dependencyRegistry, dirname, filename) {
    optimizerManifest = optimizerManifest || {};

    ok(dependencyRegistry, '"dependencyRegistry" is required');
    ok(dirname, '"dirname" is required');
    ok(typeof dirname === 'string', '"dirname" must be a string');

    extend(this, optimizerManifest);
    
    this._uniqueId = nextId++;

    this.dirname = dirname;
    this.filename = filename;
    
    this.dependencies = new DependencyList(
        optimizerManifest.dependencies || [],
        dependencyRegistry,
        this.dirname,
        this.filename);

    this.async = null;

    var async = optimizerManifest.async;
    if (async) {

        if (typeof async !== 'object') {
            throw new Error('async should be an object. (dirname=' + dirname + ', filename=' + filename + ')');
        }

        this.async = {};

        for (var asyncName in async) {
            if (async.hasOwnProperty(asyncName)) {
                var asyncDependencies = async[asyncName];
                this.async[asyncName] = new DependencyList(
                    asyncDependencies,
                    dependencyRegistry,
                    this.dirname,
                    this.filename);
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