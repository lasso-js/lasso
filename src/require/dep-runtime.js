var nodePath = require('path');
var fs = require('fs');

var lassoModulesClientMainPath = require.resolve('lasso-modules-client');
var modGlobalVarRegex = /\$_mod/g;

exports.create = function(config, lasso) {
    var modulesRuntimeGlobal = config.modulesRuntimeGlobal;

    return {
        getDir: function() {
            return nodePath.dirname(lassoModulesClientMainPath);
        },

        async read (lassoContext) {
            let contents = await fs.promises.readFile(lassoModulesClientMainPath, 'utf8');

            if (modulesRuntimeGlobal) {
                contents = contents.replace(modGlobalVarRegex, modulesRuntimeGlobal);
            }

            return contents;
        },

        getUnbundledTargetPrefix: function(lassoContext) {
            return config.unbundledTargetPrefix;
        },

        getSourceFile: function() {
            return lassoModulesClientMainPath;
        },

        calculateKey () {
            return 'modules-runtime';
        }
    };
};
