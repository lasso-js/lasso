var transport = require('lasso-modules-client/transport');
var nodePath = require('path');

exports.create = function(config, lasso) {
    return {
        properties: {
            'dir': 'string',
            'main': 'string'
        },

        async init() {},

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

        async getLastModified (lassoContext) {
            return -1;
        },

        getSourceFile: function() {
            return this._sourceFile;
        },

        calculateKey () {
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
