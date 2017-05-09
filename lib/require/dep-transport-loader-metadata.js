var transport = require('lasso-modules-client/transport');

exports.create = function(config, lasso) {
    return {
        properties: {},

        init(lassoContext) {

        },

        read: function(lassoContext) {
            var loaderMetadata = lassoContext && lassoContext.loaderMetadata;
            if (!loaderMetadata) {
                return null;
            }

            return transport.codeGenerators.loaderMetadata(
                loaderMetadata,
                lassoContext,
                {
                    modulesRuntimeGlobal: config.modulesRuntimeGlobal
                });
        },

        getUnbundledTargetPrefix: function(lassoContext) {
            return config.unbundledTargetPrefix;
        },

        getUnbundledTarget: function() {
            return 'lasso-modules-meta';
        },

        calculateKey: function() {
            return 'loader-metadata';
        },

        getLastModified: function(lassoContext, callback) {
            callback(null, -1);
        }
    };
};
