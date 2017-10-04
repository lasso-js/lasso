var extend = require('raptor-util').extend;
var DependencyList = require('./DependencyList');
var ok = require('assert').ok;

var nodePath = require('path');
var FlagSet = require('./FlagSet');
var nextId = 0;

var condition = require('./condition');

var lassoResolveFrom = require('lasso-resolve-from');

var logger = require('raptor-logging').logger(module);

function resolveBrowserPath(dir, path) {
    var resolved;

    if (path.charAt(0) === '.') {
        resolved = lassoResolveFrom(dir, path);
    } else {
        resolved = lassoResolveFrom(dir, './' + path);
        if (!resolved) {
            resolved = lassoResolveFrom(dir, path);
        }
    }

    return resolved ? resolved.path : undefined;
}

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
        this.requireRemap = requireRemap.map((requireRemap) => {
            var from = resolveBrowserPath(dirname, requireRemap.from);
            var to = resolveBrowserPath(dirname, requireRemap.to);

            return {
                from: from,
                to: to,
                condition: condition.fromObject(requireRemap)
            };
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
    async getDependencies (options) {
        logger.debug('getDependencies()');

        var flags = options && options.flags;
        if (!flags || !flags.__FlagSet) {
            flags = new FlagSet(flags);
        }

        logger.debug('getDependencies() Normalizing dependencies BEGIN: ', this.dependencies);

        const dependencies = await this.dependencies.normalize();
        logger.debug('getDependencies() Normalizing dependencies DONE: ', this.dependencies);
        return dependencies;
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
