const nodePath = require('path');
const fs = require('fs');

const lassoModulesClientMainPath = require.resolve('lasso-modules-client');
const modGlobalVarRegex = /\$_mod/g;

exports.create = function(config, lasso) {
    const modulesRuntimeGlobal = config.modulesRuntimeGlobal;

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
