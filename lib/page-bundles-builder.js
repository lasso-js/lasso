var PageBundles = require('./PageBundles');
var dependencyWalker = require('./dependency-walker');
var assert = require('assert');
var promises = require('raptor-promises');
var OptimizerManifest = require('./OptimizerManifest');

var asyncPageBundlesBuilder = require('./async-page-bundles-builder');
var DependencyTree = require('./DependencyTree');
var logger = require('raptor-logging').logger(module);

function build(options, config, bundleMappings, context) {
    assert.ok(options, '"options" is required');
    assert.ok(config, '"config" is required');
    assert.ok(bundleMappings, '"bundleMappings" is required');
    assert.ok(context, '"context" is required');

    var pageName = options.name || options.pageName;
    
    
    var optimizerManifest = options.optimizerManifest;
    var enabledExtensions = options.enabledExtensions;

    assert.ok(pageName, 'page name is required');
    assert.ok(typeof pageName === 'string', 'page name should be a string');
    assert.ok(optimizerManifest, '"optimizerManifest" is required');
    assert.ok(OptimizerManifest.isOptimizerManifest(optimizerManifest), '"optimizerManifest" is not a valid package');
    var pageBundleName = pageName.replace(/^[^A-Za-z0-9_\-\.]*/g, '');
    var pageBundles = new PageBundles();

    function buildPageBundles() {
        var asyncDependencies = [];

        // STEP 1:
        // Put all of the dependencies into bundles and keep track of
        // packages that are asynchronous.
        function assignDependenciesToBundles() {
            var tree = new DependencyTree();

            return dependencyWalker.walk({
                    optimizerManifest: optimizerManifest,
                    enabledExtensions: enabledExtensions,
                    context: context,
                    on: {
                        package: function(pkg, parentDependency, context) {
                            if (context.async) {
                                context.skipPackage();
                                return;
                            }
                        },
                        dependency: function(dependency, context) {

                            if (dependency.async) {
                                // We will handle dependencies marked as asynchronous later
                                asyncDependencies.push(dependency);

                                if (context.skipPackage) {
                                    // Don't bother recursing into async packages
                                    context.skipPackage();
                                }

                                return;
                            }

                            if (dependency.isPackageDependency()) {
                                tree.add(dependency, context.parentDependency);
                                // We are only interested in the actual dependencies (not ones that resolve to more dependencies)
                                return;
                            }

                            if (context.async) {
                                throw new Error('Illegal state');
                            }

                            var bundle = bundleMappings.getBundleForDependency(dependency);
                            

                            if (!bundle) {
                                bundle = bundleMappings.addDependencyToPageBundle(
                                    dependency, 
                                    pageBundleName, 
                                    context.async, 
                                    context.slot);
                                
                                tree.add(dependency, context.parentDependency);
                            }

                            // At this point we have added the dependency to a bundle and we know the bundle is not asynchronous
                            pageBundles.addBundleToSlot(bundle);
                        }
                    }
                })
                .then(function() {
                    logger.info('Page bundle "' + pageBundleName + '":\n' + tree.toString());
                });
        }


        // STEP 2:
        // Build asynchronous bundles and loader metadata
        function assignAsyncDependenciesToBundles() {
            return asyncPageBundlesBuilder.buildAsyncPageBundles(
                    pageBundleName + "-async",
                    asyncDependencies,
                    bundleMappings,
                    pageBundles,
                    context);
        }
        
        return assignDependenciesToBundles()
            .then(assignAsyncDependenciesToBundles)
            .then(function() {
                return pageBundles;
            });
    }

    return promises.resolved()
        .then(buildPageBundles);
}

exports.build = build;