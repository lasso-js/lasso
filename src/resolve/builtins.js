var lassoResolveFrom = require('lasso-resolve-from');
var extend = require('raptor-util/extend');

function resolveBuiltin(target) {
    var resolved = lassoResolveFrom(__dirname, target);
    if (!resolved) {
        throw new Error('Missing builtin: ' + target);
    }
    return resolved.path;
}

var defaultBuiltins = {
    'assert': resolveBuiltin('assert'),
    'buffer': resolveBuiltin('buffer'),
    'events': resolveBuiltin('events'),
    'lasso-loader': resolveBuiltin('lasso-loader'),
    'path': resolveBuiltin('path-browserify'),
    'process': resolveBuiltin('process'),
    'raptor-loader': resolveBuiltin('lasso-loader'),
    'stream': resolveBuiltin('stream-browserify'),
    'string_decoder': resolveBuiltin('string_decoder'),
    'url': resolveBuiltin('url'),
    'util': resolveBuiltin('util')
};

exports.getBuiltins = function(additionalBuiltins) {
    var allBuiltins = extend({}, defaultBuiltins);

    function addBuiltins(builtins) {
        Object.keys(builtins).forEach(function(packageName) {
            var builtinTarget = builtins[packageName];

            if (typeof builtinTarget !== 'string') {
                throw new Error('Invalid builtin: ' + packageName + ' (target: ' + builtinTarget + ')');
            }

            allBuiltins[packageName] = builtinTarget;
        });
    }

    if (additionalBuiltins) {
        addBuiltins(additionalBuiltins);
    }

    return allBuiltins;
};
