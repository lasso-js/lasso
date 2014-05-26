var optimizer = require('../');
var logger = require('raptor-logging').logger(module);
var raptorPromises = require('raptor-promises');
var nodePath = require('path');
var fs = require('fs');
var cwd = process.cwd();

module.exports = function render(input, context) {
    var pageOptimizer = input.optimizer;

    if (!pageOptimizer) {
        pageOptimizer = optimizer.defaultPageOptimizer;
    }

    var optimizedPage;
    var optimizerRenderContext = optimizer.getRenderContext(context);

    var pageName = input.name || input.pageName;

    if (!pageName) {
        if (input.dirname) {
            pageName = nodePath.relative(cwd, input.dirname);
        }
    }

    function doOptimizePage() {
        var enabledExtensions = pageOptimizer.resolveEnabledExtensions(optimizerRenderContext, input);


        var cache = pageOptimizer.getCache({
            renderContext: context,
            enabledExtensions: enabledExtensions
        });

        if (logger.isDebugEnabled()) {
            logger.debug('Enabled page extensions: ' + enabledExtensions);
        }
        
        var cacheKey = input.cacheKey || pageName;

        

        return cache.getOptimizedPage(
            cacheKey,
            {
                builder: function() {
                    var dependencies = input.dependencies;
                    var packagePath = input.packagePath;
                    var packagePaths = input.packagePaths;

                    

                    if (packagePath) {
                        if (input.dirname) {
                            packagePath = nodePath.resolve(input.dirname, packagePath);
                        }
                    } else if (dependencies) {

                    } else if (packagePaths) {
                        if (typeof packagePaths === 'string') {
                            packagePaths = packagePaths.split(/\s*,\s*/);
                        }
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

                    if (!dependencies && !packagePath && !packagePaths) {
                        dependencies = [];
                    }

                    return pageOptimizer.optimizePage({
                        pageName: pageName,
                        context: input.context || optimizerRenderContext.attributes,
                        dependencies: dependencies,
                        from: input.module || input.dirname,
                        basePath: input.basePath,
                        enabledExtensions: enabledExtensions,
                        packagePath: packagePath,
                        packagePaths: packagePaths
                    });
                }
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
};
