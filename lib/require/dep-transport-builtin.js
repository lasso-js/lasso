var transport = require('lasso-modules-client/transport');
var nodePath = require('path');

exports.create = function(config, lasso) {
    return {
        properties: {
            name: 'string',
            target: 'string'
        },

        init(lassoContext) {

        },

        getDir: function() {
            return nodePath.dirname(this._sourceFile);
        },

        read: function(context) {
            return transport.codeGenerators.builtin(
                this.name,
                this.target,
                {
                    modulesRuntimeGlobal: config.modulesRuntimeGlobal
                });
        },

        getLastModified: function(lassoContext, callback) {
            callback(null, -1);
        },

        getUnbundledTargetPrefix: function(lassoContext) {
            return config.unbundledTargetPrefix;
        },

        getUnbundledTarget: function() {
            return 'lasso-modules-meta';
        },

        getSourceFile: function() {
            return this._sourceFile;
        },

        calculateKey: function() {
            return 'modules-builtin:' + this.name + '>' + this.target;
        }
    };
};
