var optimizer = require('../');
var nodePath = require('path');
var immediateThen = require('raptor-promises/util').immediateThen;

exports.render = function(input, context) {
    var pageOptimizer = input.optimizer;

    if (!pageOptimizer) {
        pageOptimizer = optimizer.defaultPageOptimizer;
    }
    
    if (!pageOptimizer) {
        throw new Error('Page optimizer not configured for application. Use require("raptor-optimizer").configureDefault(config) to configure the default page optimizer or provide an optimizer as input using the "optimizer" attribute.');
    }

    var src = input.src;
    var imgPath = nodePath.resolve(input.dirname, src);

    context.beginAsyncFragment(function(asyncContext, asyncFragment) {
        return pageOptimizer.then(function(pageOptimizer) {
            var optimizerRenderContext = optimizer.getRenderContext(context);
            var optimizerContext = context.getAttributes().optimizerContext;

            if (!optimizerContext) {
                optimizerContext = context.getAttributes().optimizerContext = pageOptimizer.createOptimizerContext();
                optimizerContext.renderContext = context;
                optimizerContext.enabledExtensions = optimizerRenderContext.getEnabledExtensions();
            }

            pageOptimizer.resolveResourceUrlCached(
                    imgPath,
                    optimizerContext)
                .then(function(url) {
                    asyncContext.write('<img src="' + url + '"');        
                    if (input['*']) {
                        asyncContext.attrs(input['*']);
                    }
                    asyncContext.write('>');

                    asyncFragment.end();
                });
        });
    });
};