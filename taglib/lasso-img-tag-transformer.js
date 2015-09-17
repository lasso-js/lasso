module.exports = function transform(node, compiler, template) {
    if (node.tagName === 'lasso-img') {
        var nextVarId = template.data.nextGetImageInfoVarId || (template.data.nextGetImageInfoVarId = 1);
        var varName = 'imageInfo' + nextVarId;
        var src = node.getProperty('src');

        node.tagName = 'img';

        var getImageInfoNode = compiler.createNode('_lasso-getImageInfo', {
            'var': varName,
            path: src
        });

        node.setAttribute('src', template.makeExpression(varName + '.url'));

        if (!node.hasAttribute('width')) {
            node.setAttribute('width', template.makeExpression(varName + '.width'));
        }

        if (!node.hasAttribute('height')) {
            node.setAttribute('height', template.makeExpression(varName + '.height'));            
        }

        node.parentNode.replaceChild(getImageInfoNode, node);
        getImageInfoNode.appendChild(node);
    }
};