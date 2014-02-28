var optimizer = require('../');
var logger = require('raptor-logging').logger(module);
var raptorPromises = require('raptor-promises');
var immediateThen = require('raptor-promises/util').immediateThen;
var ok = require('assert').ok;
var nodePath = require('path');
var fs = require('fs');

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
                {
                    builder: function() {
                        var dependencies = input.dependencies;
                        var packagePath = input.packagePath;

                        if (packagePath) {
                            if (input.dirname) {
                                packagePath = nodePath.resolve(input.dirname, packagePath);
                            }
                        } else if (dependencies) {

                        } else if (input.invokeBody) {
                            dependencies = [];
                            input.invokeBody({
                                addDependency: function(dependency) {
                                    dependencies.push(dependency);
                                }
                            });
                        } else {
                            // Look for an optimizer.json in the same directory
                            if (input.dirname) {
                                packagePath = nodePath.join(input.dirname, 'optimizer.json');
                                if (!fs.existsSync(packagePath)) {
                                    packagePath = null;
                                }
                            }
                        }

                        if (!dependencies && !packagePath) {
                            dependencies = [];
                        }

                        return pageOptimizer.optimizePage({
                            pageName: pageName,
                            dependencies: dependencies,
                            from: input.module || input.dirname,
                            basePath: input.basePath,
                            enabledExtensions: enabledExtensions,
                            packagePath: packagePath
                        });
                    }
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