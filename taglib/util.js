var OptimizerRenderContext = require('./OptimizerRenderContext');
var CONTEXT_KEY = 'lasso/OptimizerRenderContext';

function getOptimizerRenderContext(renderContext) {
    var data = renderContext.attributes;
    return data[CONTEXT_KEY] ||
        (data[CONTEXT_KEY] = new OptimizerRenderContext(renderContext));
}

exports.getOptimizerRenderContext = getOptimizerRenderContext;