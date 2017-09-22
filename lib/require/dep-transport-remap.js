var transport = require('lasso-modules-client/transport');
var nodePath = require('path');

exports.create = function(config, lasso) {
    return {
        properties: {
            'from': 'string',
            'to': 'string',
            'fromFile': 'string'
        },

        async init (lassoContext) {},

        getDir: function() {
            return this.fromFile ? nodePath.dirname(this.fromFile) : undefined;
        },

        read: function(context) {
            return transport.codeGenerators.remap(
                this.from,
                this.to,
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
            return 'modules-remap:' + this.from + '|' + this.to;
        },

        getUnbundledTargetPrefix: function(lassoContext) {
            return config.unbundledTargetPrefix;
        },

        getUnbundledTarget: function() {
            return 'lasso-modules-meta';
        }
    };
};
