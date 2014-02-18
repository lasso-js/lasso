var optimizer = require('../');
var logger = require('raptor-logging').logger(module);
var raptorPromises = require('raptor-promises');
var immediateThen = require('raptor-promises/util').immediateThen;


module.exports = {
    process: function(input, context) {
        var pageOptimizer = input.optimizer;

        if (!pageOptimizer) {
            pageOptimizer = optimizer.defaultPageOptimizer;
        }
        
        if (!pageOptimizer) {
            throw new Error('Page optimizer not configured for application. require("raptor-optimizer").configureDefault(config) or provide an optimizer as input using the "optimizer" attribute.');
        }

        var optimizedPage;
        var optimizerRenderContext = optimizer.getRenderContext(context);

        function doOptimizePage(pageOptimizer) {
            var enabledExtensions = pageOptimizer.resolveEnabledExtensions(optimizerRenderContext, input);
            var dependencies = input.dependencies;

            var cache = pageOptimizer.getCache({
                renderContext: context,
                enabledExtensions: enabledExtensions
            });

            if (logger.isDebugEnabled()) {
                logger.debug("Enabled page extensions: " + enabledExtensions);
            }

            if (!dependencies) {
                dependencies = [];
                input.invokeBody({
                    addDependency: function(dependency) {
                        dependencies.push(dependency);
                    }
                });
            }

            if (!dependencies) {
                dependencies = [];
            }
            
            var pageName = input.name || input.pageName;
            var cacheKey = input.cacheKey || pageName;

            return cache.getOptimizedPage(
                cacheKey,
                function() {
                    return pageOptimizer.optimizePage({
                        pageName: pageName,
                        dependencies: dependencies,
                        from: input.module || input.dirname,
                        basePath: input.basePath,
                        enabledExtensions: enabledExtensions
                    });
                });
        }
        
        var waitFor = optimizerRenderContext.getWaitFor();
        if (waitFor && waitFor.length) {
            logger.debug('Waiting for ' + waitFor.length + ' promise(s) to complete before optimizing page.');
            optimizedPage = raptorPromises.all(waitFor)
                .then(function() {
                    return pageOptimizer;
                })
                .then(doOptimizePage);
        }
        else {
            optimizedPage = immediateThen(pageOptimizer, doOptimizePage);
        }

        context.attributes.optimizedPage = optimizedPage;
    }
};