var optimizer = require('../');
var nodePath = require('path');
var attrs = require('raptor-util/attrs');
var util = require('./util');

module.exports = function render(input, context) {
    var pageOptimizer = input.optimizer;
    var optimizerRenderContext = util.getOptimizerRenderContext(context);

    if (!pageOptimizer) {
        pageOptimizer = optimizerRenderContext.data.pageOptimizer || optimizer.defaultPageOptimizer;
    }
    
    if (!pageOptimizer) {
        throw new Error('Page optimizer not configured for application. Use require("optimizer").configureDefault(config) to configure the default page optimizer or provide an optimizer as input using the "optimizer" attribute.');
    }

    var src = input.src;
    var imgPath = nodePath.resolve(input.dirname, src);

    var optimizerContext = optimizerRenderContext.data.optimizerContext;

    if (!optimizerContext) {
        optimizerContext = optimizerRenderContext.data.optimizerContext = pageOptimizer.createOptimizerContext();
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
        asyncContext = context.beginAsync({name: 'optimizer-img:' + imgPath});
    }
};