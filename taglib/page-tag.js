var raptorOptimizer = require('../');
var util = require('./util');
var logger = require('raptor-logging').logger(module);
var raptorPromises = require('raptor-promises');
var nodePath = require('path');
var fs = require('fs');
var DataHolder = require('raptor-async/DataHolder');
var extend = require('raptor-util/extend');

module.exports = function render(input, context) {
    var pageOptimizer = input.optimizer;

    if (!pageOptimizer) {
        pageOptimizer = raptorOptimizer.defaultPageOptimizer;
    }

    var optimizerRenderContext = util.getOptimizerRenderContext(context);
    
    var pageName = input.name || input.pageName;

    if (!pageName) {
        if (input.dirname) {
            // Use the base name of the containing directory as the page name
            // Example: "myapp/src/pages/welcome/index.rhtml" --> "welcome"
            pageName = nodePath.basename(input.dirname);
        }
    }

    // We need to provide the optimizer with some data that it might need
    // to optimize the page correctly. We provide "renderContext", specifically,
    // because the "renderContext" also holds a response to the output stream
    // which may be the HTTP response object. From the HTTP response object
    // we can get to the HTTP request. From the HTTP request we can get to the user
    // locale and the protocol (e.g. "http" versus "https") and all of this information
    // may be needed to optimize the page correctly. Ultimately, during the optimization
    // phase, this data can be access using the "optimizerContext.data" property
    var optimizerContextData = {
        renderContext: context
    };

    // The user of the tag may have also provided some additional data to add
    // to the optimizer context
    var inputData = input.data;
    if (inputData) {
        extend(optimizerContextData, inputData);
    }

    // Store the pageOptimizer into the render context in case it is needed
    // later (e.g. to optimize a image resource referenced by a <optimizer-img> tag).
    optimizerRenderContext.data.pageOptimizer = pageOptimizer;

    var optimizedPageDataHolder;
    
    // store optimized page data holder in the context data (used by slot tags)
    optimizerRenderContext.data.optimizedPage = optimizedPageDataHolder = new DataHolder();

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
                data: optimizerContextData,
                
                // Provide base path for resolving relative top-level dependencies
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
