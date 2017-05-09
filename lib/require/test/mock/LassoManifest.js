var ok = require('assert').ok;
var nodePath = require('path');
var condition = require('./condition');
var lassoResolveFrom = require('lasso-resolve-from');

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
    if (options.manifest) {
        Object.assign(this, options.manifest);
    }


    if (options.dirname) {
        this.dirname = options.dirname;
    }

    if (options.filename) {
        this.filename = options.filename;
    }

    var dirname = this.dirname;

    ok(dirname, '"dirname" is required');
    ok(typeof dirname === 'string', '"dirname" must be a string');

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