var LassoRenderContext = require('./LassoRenderContext');
var CONTEXT_KEY = 'lasso/LassoRenderContext';

function getLassoRenderContext(out) {
    var data = out.global;
    return data[CONTEXT_KEY] ||
        (data[CONTEXT_KEY] = new LassoRenderContext(out));
}

exports.getLassoRenderContext = getLassoRenderContext;