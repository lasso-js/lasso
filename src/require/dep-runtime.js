const promisify = require('pify');

var nodePath = require('path');
var fs = require('fs');

const readFileAsync = promisify(fs.readFile);

var lassoModulesClientMainPath = require.resolve('lasso-modules-client');
var FS_READ_OPTIONS = {encoding: 'utf8'};
var modGlobalVarRegex = /\$_mod/g;

exports.create = function(config, lasso) {
    var modulesRuntimeGlobal = config.modulesRuntimeGlobal;

    return {
        getDir: function() {
            return nodePath.dirname(lassoModulesClientMainPath);
        },

        async read (lassoContext) {
            let contents = await readFileAsync(lassoModulesClientMainPath, FS_READ_OPTIONS);

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
