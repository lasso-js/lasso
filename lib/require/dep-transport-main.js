var transport = require('lasso-modules-client/transport');
var nodePath = require('path');

exports.create = function(config, lasso) {
    return {
        properties: {
            'dir': 'string',
            'main': 'string'
        },

        init() {

        },

        getDir: function() {
            return nodePath.dirname(this._sourceFile);
        },

        read: function(context) {
            return transport.codeGenerators.main(
                this.dir,
                this.main,
                {
                    modulesRuntimeGlobal: config.modulesRuntimeGlobal
                });
        },

        getLastModified: function(lassoContext, callback) {
            callback(null, -1);
        },

        getSourceFile: function() {
            return this._sourceFile;
        },

        calculateKey: function() {
            return 'modules-main:' + this.dir + '|' + this.main;
        },

        getUnbundledTargetPrefix: function(lassoContext) {
            return config.unbundledTargetPrefix;
        },

        getUnbundledTarget: function() {
            return 'lasso-modules-meta';
        }
    };
};
