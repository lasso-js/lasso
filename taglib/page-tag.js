var optimizer = require('../');
var logger = require('raptor-logging').logger(module);
var raptorPromises = require('raptor-promises');

module.exports = {
    process: function(input, context) {
        var pageOptimizer = input.optimizer;

        if (!pageOptimizer) {
            pageOptimizer = optimizer.pageOptimizer;
        }
        
        if (!pageOptimizer) {
            throw new Error('Page optimizer not configured for application. require("raptor/optimizer").configure(config) or provide an optimizer as input using the "optimizer" attribute.');
        }

        var optimizedPage;
        var optimizerRenderContext = optimizer.getRenderContext(context);

        function doOptimizePage() {
            var enabledExtensions = pageOptimizer.resolveEnabledExtensions(optimizerRenderContext, input);

            var cache = pageOptimizer.getCache({
                renderContext: context,
                enabledExtensions: enabledExtensions
            });

            if (logger.isDebugEnabled()) {
                logger.debug("Enabled page extensions: " + enabledExtensions);
            }
            
            var pageName = input.name || input.pageName;
            var cacheKey = input.cacheKey || pageName;

            return cache.getOptimizedPage(
                cacheKey,
                function() {
                    return pageOptimizer.optimizePage({
                        pageName: pageName,
                        dependencies: input.dependencies,
                        from: input.module || input.dirname,
                        basePath: input.basePath
                    });
                });
        }
        
        var waitFor = optimizerRenderContext.getWaitFor();
        if (waitFor && waitFor.length) {
            logger.debug('Waiting for ' + waitFor.length + ' promise(s) to complete before optimizing page.');
            optimizedPage = raptorPromises.all(waitFor)
                .then(doOptimizePage);
        }
        else {
            optimizedPage = doOptimizePage();
        }

        context.attributes.optimizedPage = optimizedPage;
    }
};