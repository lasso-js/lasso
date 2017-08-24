var getLassoRenderContext = require('./getLassoRenderContext');

module.exports = function(out) {
    var lassoRenderContext = getLassoRenderContext(out);
    var lassoConfig = lassoRenderContext.getLassoConfig();

    var cspNonceProvider = lassoConfig.cspNonceProvider;
    if (cspNonceProvider) {
        return cspNonceProvider(out, lassoRenderContext);
    }
};
