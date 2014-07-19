var raptorOptimizer = require('../');
var logger = require('raptor-logging').logger(module);
var raptorPromises = require('raptor-promises');
var nodePath = require('path');
var fs = require('fs');
var cwd = process.cwd();

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
            pageName = nodePath.relative(cwd, input.dirname);
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

        var optimizerContext = {
            pageName: pageName,
            enabledExtensions: enabledExtensions
        };

        var optimizerCache = pageOptimizer.getOptimizerCache(optimizerContext);
        
        if (logger.isDebugEnabled()) {
            logger.debug('Enabled page extensions: ' + enabledExtensions);
        }
        
        var cacheKey = input.cacheKey || pageName;
        
        optimizerCache.getOptimizedPage(
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

                    pageOptimizer.optimizePage({
                            // the page name (used for caching)
                            pageName: pageName,
                            
                            // properties for the optimizer context
                            optimizerContext: input.optimizerContext || optimizerRenderContext.attributes,
                            
                            // what is this for?
                            from: input.module || input.dirname,
                            
                            // what is this for?
                            basePath: input.basePath,
                            
                            // extensions to be enabled at time of rendering
                            enabledExtensions: enabledExtensions,
                            
                            // list of dependencies from which to start optimization
                            dependencies: dependencies,
                            
                            // path to an optimizer.json file from wich to start optimization
                            packagePath: packagePath,
                            
                            // an array of paths to optimizer.json files from wich to start optimization
                            packagePaths: packagePaths
                        },
                        done);
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
