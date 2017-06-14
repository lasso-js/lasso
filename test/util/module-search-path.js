var Module = require('module').Module;
var oldNodeModulePaths = Module._nodeModulePaths;

exports.patchSearchPath = function(dir) {
    Module._nodeModulePaths = function(from) {
        var paths = oldNodeModulePaths.call(this, from);
        paths = paths.concat([dir]);
        return paths;
    };

    return {
        restore: function() {
            Module._nodeModulePaths = oldNodeModulePaths;
        }
    };
};