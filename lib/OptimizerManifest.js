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
        this.filename);

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
    getDependencies: function(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }


        ok(typeof callback === 'function', 'callback function expected');


        var enabledExtensions = options && options.enabledExtensions;
        if (!enabledExtensions || !enabledExtensions.__ExtensionSet) {
            enabledExtensions = new ExtensionSet(enabledExtensions);
        }

        this.dependencies.normalize(function(err, dependencies) {
            if (err) {
                return callback(err);
            }

            var finalDependencies = [];

            for (var i=0, len=dependencies.length; i<len; i++) {
                var dependency = dependencies[i];

                if (dependency._condition && !dependency._condition(enabledExtensions)) {
                    continue;
                }

                finalDependencies.push(dependency);
            }

            callback(null, finalDependencies);
        });
    }
};

OptimizerManifest.isOptimizerManifest = function(o) {
    return o && o.__OptimizerManifest;
};

module.exports = OptimizerManifest;