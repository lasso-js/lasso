exports.getLassoConfig = function() {
    return {
        bundlingEnabled: true,
        fingerprintsEnabled: true,
        cspNonceProvider: function(out, lassoContext) {
            return out.global.cspNonce;
        }
    };
};