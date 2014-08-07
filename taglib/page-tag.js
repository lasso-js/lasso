var raptorOptimizer = require('../');
var logger = require('raptor-logging').logger(module);
var raptorPromises = require('raptor-promises');
var nodePath = require('path');
var fs = require('fs');
var DataHolder = require('raptor-async/DataHolder');

module.exports = function render(input, context) {
    var pageOptimizer = input.optimizer;

    if (!pageOptimizer) {
        pageOptimizer = raptorOptimizer.defaultPageOptimizer;
    }

    var optimizerRenderContext = raptorOptimizer.getOptimizerRenderContext(context);

    var pageName = input.name || input.pageName;

    if (!pageName) {
        if (input.dirname) {
            // Use the base name of the containing directory as the page name
            // Example: "myapp/src/pages/welcome/index.rhtml" --> "welcome"
            pageName = nodePath.basename(input.dirname);
        }
    }

    var optimizedPageDataHolder;
    
    // store optimized page data holder in the context attributes (used by slot tags)
    context.attributes.optimizedPage = optimizedPageDataHolder = new DataHolder();

    function done(err, optimizedPage) {
        if (err) {
            optimizedPageDataHolder.reject(err);
        } else {
            optimizedPageDataHolder.resolve(optimizedPage);
        }
        
    }

    function doOptimizePage() {
        
        var enabledExtensions = pageOptimizer.resolveEnabledExtensions(optimizerRenderContext, input);

        if (logger.isDebugEnabled()) {
            logger.debug('Enabled page extensions: ' + enabledExtensions);
        }
        
        pageOptimizer.optimizePage({
                // Make sure the page is cached (should be the default)
                cache: true,
                
                // the page name (used for caching)
                pageName: pageName,
                
                // properties for the optimizer context
                context: input.optimizerContext || optimizerRenderContext.attributes,
                
                // what is this for?
                from: input.module || input.dirname,
                
                // what is this for?
                basePath: input.basePath,
                
                // extensions to be enabled at time of rendering
                enabledExtensions: enabledExtensions,

                dependencies: function(callback) {
                    var dependencies = input.dependencies;
                    var packagePath = input.packagePath;
                    var packagePaths = input.packagePaths;

                    if (packagePath) {
                        if (input.dirname) {
                            packagePath = nodePath.resolve(input.dirname, packagePath);
                        }

                        dependencies = [packagePath];
                    } else if (dependencies) {

                    } else if (packagePaths) {
                        if (typeof packagePaths === 'string') {
                            packagePaths = packagePaths.split(/\s*,\s*/);
                        }

                        dependencies = packagePaths;
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

                    callback(null, dependencies);
                }
            },
            done);
    }

    var waitFor = optimizerRenderContext.getWaitFor();

    if (input.waitFor) {
        if (waitFor) {
            waitFor.push(input.waitFor);
        } else {
            waitFor = [input.waitFor];
        }
    }

    if (waitFor && waitFor.length) {
        logger.debug('Waiting for ' + waitFor.length + ' promise(s) to complete before optimizing page.');
        raptorPromises.all(waitFor)
            .then(doOptimizePage)
            .done();
    }
    else {
        doOptimizePage();
    }
};
