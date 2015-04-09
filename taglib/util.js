var LassoRenderContext = require('./LassoRenderContext');
var CONTEXT_KEY = 'lasso/LassoRenderContext';

function getLassoRenderContext(renderContext) {
    var data = renderContext.attributes;
    return data[CONTEXT_KEY] ||
        (data[CONTEXT_KEY] = new LassoRenderContext(renderContext));
}

exports.getLassoRenderContext = getLassoRenderContext;