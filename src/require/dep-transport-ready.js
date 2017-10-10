var transport = require('lasso-modules-client/transport');

exports.create = function(config, lasso) {
    return {
        properties: {
        },

        async init() {
            if (!this.slot) {
                delete this.slot;
            }
        },

        getDir: function() {
            return null;
        },

        read: function(context) {
            return transport.codeGenerators.ready({
                modulesRuntimeGlobal: config.modulesRuntimeGlobal
            });
        },

        calculateKey () {
            return 'modules-ready';
        },

        async getLastModified (lassoContext) {
            return -1;
        }
    };
};
