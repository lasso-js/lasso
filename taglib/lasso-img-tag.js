var getImageInfoHelperPath = require.resolve('./helper-getImageInfo');

module.exports = function codeGenerator(el, codegen) {
    if (el.isFlagSet('lassoTransformed')) {
        return el;
    }
    el.setFlag('lassoTransformed');

    var builder = codegen.builder;
    var context = codegen.context;

    var getImageInfoRequirePath = codegen.getRequirePath(getImageInfoHelperPath);
    var getImageInfoVar = codegen.importModule('__getImageInfo', getImageInfoRequirePath);

    var nextVarId = context.data.nextGetImageInfoVarId || (context.data.nextGetImageInfoVarId = 0);
    var imageInfoVar = builder.identifier('imageInfo' + (nextVarId++));

    var src = codegen.resolvePath(el.getAttributeValue('src'));

    el.setAttributeValue('src',
        builder.memberExpression(
            imageInfoVar,
            builder.identifier('url')));

    if (!el.hasAttribute('width')) {
        el.setAttributeValue('width',
            builder.memberExpression(
                imageInfoVar,
                builder.identifier('width')));
    }

    if (!el.hasAttribute('height')) {
        el.setAttributeValue('height',
            builder.memberExpression(
                imageInfoVar,
                builder.identifier('height')));
    }

    // Convert the <lasso-img> tag over to <img>
    el.setTagName('img');
    el.openTagOnly = true;

    return builder.functionCall(getImageInfoVar, [
        builder.identifierOut(),
        src,
        builder.functionDeclaration(
            null, // Callback name
            [ // Callback params
                builder.identifierOut(),
                imageInfoVar
            ],
            [ // Callback function body
                el
            ])
    ]);
};
