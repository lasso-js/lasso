var lasso = require('../');
var util = require('./util');
var logger = require('raptor-logging').logger(module);
var raptorPromises = require('raptor-promises');
var nodePath = require('path');
var fs = require('fs');
var AsyncValue = require('raptor-async/AsyncValue');
var extend = require('raptor-util/extend');

module.exports = function render(input, context) {
    var theLasso = input.lasso;

    if (!theLasso) {
        theLasso = lasso.defaultLasso;
    }

    var lassoRenderContext = util.getLassoRenderContext(context);

    var pageName = input.name || input.pageName;
    var cacheKey = input.cacheKey;

    if (!pageName && input.dirname) {
        if (input.dirname) {
            // Use the base name of the containing directory as the page name
            // Example: "myapp/src/pages/welcome/index.marko" --> "welcome"
            pageName = nodePath.basename(input.dirname);
        }
    }

    if (!cacheKey) {
        cacheKey = input.filename || pageName; // Use the filename of the template as the cache key
    }

    // We need to provide the lasso with some data that it might need
    // to build the page correctly. We provide "renderContext", specifically,
    // because the "renderContext" also holds a response to the output stream
    // which may be the HTTP response object. From the HTTP response object
    // we can get to the HTTP request. From the HTTP request we can get to the user
    // locale and the protocol (e.g. "http" versus "https") and all of this information
    // may be needed to build the page correctly. Ultimately, during the optimization
    // phase, this data can be access using the "lassoContext.data" property
    var lassoContextData = {
        renderContext: context
    };

    // The user of the tag may have also provided some additional data to add
    // to the lasso context
    var inputData = input.data;
    if (inputData) {
        extend(lassoContextData, inputData);
    }

    // Store the theLasso into the render context in case it is needed
    // later (e.g. to bundle a image resource referenced by a <lasso-img> tag).
    lassoRenderContext.data.lasso = theLasso;

    var lassoPageResultAsyncValue;

    // store lassoed page data holder in the context data (used by slot tags)
    lassoRenderContext.data.lassoPageResult = lassoPageResultAsyncValue = new AsyncValue();
    lassoRenderContext.data.timeout = input.timeout || 30000 /* 30s */;

    function done(err, lassoPageResult) {
        if (err) {
            lassoPageResultAsyncValue.reject(err);
        } else {
            lassoPageResultAsyncValue.resolve(lassoPageResult);
        }
    }

    function doLassoPage() {

        theLasso.lassoPage({
                // Make sure the page is cached (should be the default)
                cache: true,

                cacheKey: cacheKey,

                // the page name (used for naming output bundles associated with this page)
                pageName: pageName,

                // properties for the lasso context
                data: lassoContextData,

                // Provide base path for resolving relative top-level dependencies
                from: input.module || input.dirname,

                // what is this for?
                basePath: input.basePath,

                // extensions to be enabled at time of rendering
                flags: input.flags || input.enabledExtensions || input.extensions,

                dependencies: function(callback) {
                    var dependencies = input.dependencies;
                    var packagePath = input.packagePath;
                    var packagePaths = input.packagePaths;

                    if (packagePath) {
                        if (input.dirname) {
                            packagePath = nodePath.resolve(input.dirname, packagePath);
                        }

                        dependencies = [
                            {
                                type: 'package',
                                'path': packagePath
                            }
                        ];
                    } else if (dependencies) {

                    } else if (packagePaths) {
                        dependencies = packagePaths.map(function(path) {
                                return {
                                    type: 'package',
                                    path: path
                                };
                            });
                    } else if (input.getDependencies) {
                        dependencies = [];
                        input.getDependencies({
                            addDependency: function(dependency) {
                                dependencies.push(dependency);
                            }
                        });
                    } else {
                        // Look for an browser.json in the same directory
                        if (input.dirname) {
                            packagePath = nodePath.join(input.dirname, 'browser.json');
                            if (fs.existsSync(packagePath)) {
                                dependencies = [
                                    {
                                        type: 'package',
                                        path: packagePath
                                    }
                                ];
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

    var waitFor = lassoRenderContext.getWaitFor();

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
            .then(doLassoPage)
            .done();
    }
    else {
        doLassoPage();
    }
};
