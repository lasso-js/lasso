var optimizer = require('../');
var nodePath = require('path');
var attrs = require('raptor-util/attrs');

module.exports = function render(input, context) {
    var pageOptimizer = input.optimizer;

    if (!pageOptimizer) {
        pageOptimizer = optimizer.defaultPageOptimizer;
    }
    
    if (!pageOptimizer) {
        throw new Error('Page optimizer not configured for application. Use require("raptor-optimizer").configureDefault(config) to configure the default page optimizer or provide an optimizer as input using the "optimizer" attribute.');
    }

    var src = input.src;
    var imgPath = nodePath.resolve(input.dirname, src);

    var optimizerContext = context.attributes.optimizerContext;

    if (!optimizerContext) {
        optimizerContext = context.attributes.optimizerContext = pageOptimizer.createOptimizerContext();
        optimizerContext.renderContext = context;
    }

    if (input.basePath) {
        optimizerContext = Object.create(optimizerContext);
        optimizerContext.basePath = input.basePath;
    }
    
    var asyncContext;
    var done = false;

    function renderImgTag(url, context) {
        context.write('<img src="' + url + '"');        
        if (input['*']) {
            context.write(attrs(input['*']));
        }
        context.write('>');
    }

    pageOptimizer.optimizeResourceCached(imgPath, optimizerContext, function(err, optimizedResource) {
        done = true;
        if (err) {
            if (asyncContext) {
                asyncContext.error(err);
            } else {
                throw err;
            }
        }

        if (asyncContext) {
            renderImgTag(optimizedResource.url, asyncContext);
            asyncContext.end();
        } else {
            renderImgTag(optimizedResource.url, context);
        }
    });

    if (!done) {
        asyncContext = context.beginAsync();
    }
};