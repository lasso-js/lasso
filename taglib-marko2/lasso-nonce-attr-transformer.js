var getNonceHelperPath = require.resolve('./helper-getNonce');

module.exports = function transform(node, compiler, template) {
    if (node.hasAttribute('lasso-nonce')) {

        node.removeAttribute('lasso-nonce');

        var getNonceRequirePath = template.getRequirePath(getNonceHelperPath);

        template.addStaticVar('__getNonce',

            'require("' + getNonceRequirePath + '")');

        node.setAttribute('nonce', template.makeExpression('__getNonce(out)'));
    }
};