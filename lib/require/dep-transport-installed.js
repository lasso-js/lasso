var transport = require('lasso-modules-client/transport');

exports.create = function(config, lasso) {
    return {
        properties: {
            'parentPath': 'string',
            'childName': 'string',
            'childVersion': 'string',
            'parentDir': 'string'
        },

        async init(lassoContext) {},

        getDir: function() {
            return this.parentDir;
        },

        read: function(context) {
            return transport.codeGenerators.installed(
                this.parentPath,
                this.childName,
                this.childVersion,
                {
                    modulesRuntimeGlobal: config.modulesRuntimeGlobal
                });
        },

        async getLastModified (lassoContext) {
            return -1;
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

        calculateKey () {
            return 'modules-installed:' + this.parentPath + '|' + this.childName + '|' + this.childVersion;
        }
    };
};
