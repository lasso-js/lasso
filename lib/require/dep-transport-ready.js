var transport = require('lasso-modules-client/transport');

exports.create = function(config, lasso) {
    return {
        properties: {
        },

        init() {
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

        calculateKey: function() {
            return 'modules-ready';
        },

        getLastModified: function(lassoContext, callback) {
            callback(null, -1);
        }
    };
};
