var transport = require('lasso-modules-client/transport');

exports.create = function(config, lasso) {
    return {
        properties: {
            'path': 'string',
            'paths': 'string[]'
        },

        async init () {
            if (!this.paths) {
                this.paths = [];
            }

            if (this.path) {
                this.paths.push(this.path);
            }
        },

        getDir: function() {
            return null;
        },

        read: function(context) {
            return transport.codeGenerators.searchPath(this.paths, {
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

        calculateKey () {
            return 'modules-search-path:' + JSON.stringify(this.paths);
        }
    };
};
