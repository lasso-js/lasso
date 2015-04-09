var extend = require('raptor-util').extend;
var DependencyList = require('./DependencyList');
var ok = require('assert').ok;

var nodePath = require('path');
var FlagSet = require('./FlagSet');
var nextId = 0;

var condition = require('./condition');

function LassoManifest(options) {

    var dependencyRegistry = options.dependencyRegistry;


    var async;

    if (options.manifest) {
        // save off the async property value
        async = options.manifest.async;

        extend(this, options.manifest);
    }

    ok(dependencyRegistry, '"dependencyRegistry" is required');

    this._uniqueId = nextId++;

    if (options.dirname) {
        this.dirname = options.dirname;
    }

    if (options.filename) {
        this.filename = options.filename;
    }

    var dirname = this.dirname;
    var filename = this.filename;

    ok(dirname, '"dirname" is required');
    ok(typeof dirname === 'string', '"dirname" must be a string');

    this.dependencies = new DependencyList(
        this.dependencies || [],
        dependencyRegistry,
        dirname,
        filename);

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
                    dirname,
                    filename);
            }
        }
    }

    var requireRemap = this.requireRemap;
    if (requireRemap && Array.isArray(requireRemap)) {
        requireRemap.forEach(function(requireRemap) {

            var from = requireRemap.from;
            var to = requireRemap.to;

            from = nodePath.resolve(dirname || process.cwd(), from);

            if (to.charAt(0) === '.') {
                to = nodePath.resolve(dirname || process.cwd(), to);
            }

            requireRemap.from = from;
            requireRemap.to = to;
            requireRemap.condition = condition.fromObject(this);
        });
    }
}

LassoManifest.prototype = {
    __LassoManifest: true,

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

        var flags = options && options.flags;
        if (!flags || !flags.__FlagSet) {
            flags = new FlagSet(flags);
        }

        this.dependencies.normalize(function(err, dependencies) {
            if (err) {
                return callback(err);
            }

            var finalDependencies = new Array(dependencies.length);
            var pos = 0;

            for (var i=0, len=dependencies.length; i<len; i++) {
                var dependency = dependencies[i];

                if (dependency._condition && !dependency._condition(flags)) {
                    continue;
                }

                finalDependencies[pos] = dependency;
                pos++;
            }

            finalDependencies.length = pos;

            callback(null, finalDependencies);
        });
    },

    getRequireRemap: function(lassoContext) {

        if (this.requireRemap && Array.isArray(this.requireRemap)) {
            var filteredRemaps = {};
            var flags = lassoContext.flags;

            this.requireRemap.forEach(function(remap) {
                if (remap.condition && !remap.condition(flags)) {
                    return;
                }

                filteredRemaps[remap.from] = remap.to;
            });

            return filteredRemaps;

        } else {
            return {};
        }
    }
};

LassoManifest.isLassoManifest = function(o) {
    return o && o.__LassoManifest;
};

module.exports = LassoManifest;