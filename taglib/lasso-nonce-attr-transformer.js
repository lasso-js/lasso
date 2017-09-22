var getNonceHelperPath = require.resolve('./helper-getNonce');

module.exports = function transform(el, context) {
    if (el.hasAttribute('lasso-nonce')) {
        el.removeAttribute('lasso-nonce');

        var builder = context.builder;

        var getNonceRequirePath = context.getRequirePath(getNonceHelperPath);

        var getNonceVar = context.importModule('__getNonce', getNonceRequirePath);

        el.setAttributeValue('nonce',
            builder.functionCall(getNonceVar, [
                builder.identifierOut()
            ]));
    }
};
