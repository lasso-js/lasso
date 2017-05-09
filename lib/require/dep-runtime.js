var nodePath = require('path');
var fs = require('fs');

var lassoModulesClientMainPath =  require.resolve('lasso-modules-client');
var FS_READ_OPTIONS = {encoding: 'utf8'};
var modGlobalVarRegex = /\$_mod/g;

exports.create = function(config, lasso) {
    var modulesRuntimeGlobal = config.modulesRuntimeGlobal;

    return {
        getDir: function() {
            return nodePath.dirname(lassoModulesClientMainPath);
        },

        read: function(lassoContext, callback) {
            fs.readFile(lassoModulesClientMainPath, FS_READ_OPTIONS, function(err, contents) {
                if (err) {
                    return callback(err);
                }

                if (modulesRuntimeGlobal) {
                    contents = contents.replace(modGlobalVarRegex, modulesRuntimeGlobal);
                }

                callback(null, contents);
            });
        },

        getUnbundledTargetPrefix: function(lassoContext) {
            return config.unbundledTargetPrefix;
        },

        getSourceFile: function() {
            return lassoModulesClientMainPath;
        },

        calculateKey: function() {
            return 'modules-runtime';
        }
    };
};
