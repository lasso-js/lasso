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
        var asyncGroups = {};

        // STEP 1:
        // Put all of the dependencies into bundles and keep track of
        // packages that are asynchronous.
        function assignDependenciesToBundles() {
            var tree =  logger.isDebugEnabled() ? new DependencyTree() : null;

            return dependencyWalker.walk({
                    optimizerManifest: optimizerManifest,
                    enabledExtensions: enabledExtensions,
                    context: context,
                    on: {
                        manifest: function(manifest, context) {

                            if (manifest.async) {
                                for (var asyncName in manifest.async) {
                                    if (manifest.async.hasOwnProperty(asyncName)) {
                                        asyncGroups[asyncName] = manifest.async[asyncName];
                                    }
                                }
                            }
                        },
                        dependency: function(dependency, context) {

                            if (dependency.isPackageDependency()) {
                                if (tree) {
                                    tree.add(dependency, context.parentDependency);
                                }

                                // We are only interested in the actual dependencies (not ones that resolve to more dependencies)
                                return;
                            }

                            var bundle = bundleMappings.getBundleForDependency(dependency);


                            if (!bundle) {
                                bundle = bundleMappings.addDependencyToPageBundle(
                                    dependency,
                                    pageBundleName,
                                    context.slot);

                                if (tree) {
                                    tree.addToBundle(bundle, dependency, context.parentDependency);
                                }
                            }

                            // At this point we have added the dependency to a bundle and we know the bundle is not asynchronous
                            pageBundles.addBundle(bundle);
                        }
                    }
                })
                .then(function() {
                    if (tree) {
                        logger.debug('Page bundles:\n' + tree.bundlesToString());
                    }
                });
        }


        // STEP 2:
        // Build asynchronous bundles and loader metadata
        function assignAsyncDependenciesToBundles() {
            return asyncPageBundlesBuilder.buildAsyncPageBundles(
                    pageBundleName + "-async",
                    asyncGroups,
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
