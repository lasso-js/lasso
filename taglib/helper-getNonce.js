var util = require('./util');

module.exports = function(out) {
    var lassoRenderContext = util.getLassoRenderContext(out);
    var lassoConfig = lassoRenderContext.getLassoConfig();

    var cspNonceProvider = lassoConfig.cspNonceProvider;
    if (cspNonceProvider) {
        return cspNonceProvider(out, lassoRenderContext);
    }
};