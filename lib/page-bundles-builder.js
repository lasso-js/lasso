var PageBundles = require('./PageBundles');
var dependencyWalker = require('./dependency-walker');
var assert = require('assert');
var promises = require('raptor-promises');
var OptimizerManifest = require('./OptimizerManifest');
var LoaderMetadata = require('./LoaderMetadata');
var DependencyTree = require('./DependencyTree');
var logger = require('raptor-logging').logger(module);
var raptorPromises = require('raptor-promises');
var bundlingStrategies = require('./bundling-strategies');

function build(options, config, bundleMappings, optimizerContext) {
    assert.ok(options, '"options" is required');
    assert.ok(config, '"config" is required');
    assert.ok(bundleMappings, '"bundleMappings" is required');
    assert.ok(optimizerContext, '"optimizerContext" is required');

    var pageName = options.name || options.pageName;

    var optimizerManifest = options.optimizerManifest;
    var enabledExtensions = optimizerContext.enabledExtensions;

    assert.ok(pageName, 'page name is required');
    assert.ok(typeof pageName === 'string', 'page name should be a string');
    assert.ok(optimizerManifest, '"optimizerManifest" is required');
    assert.ok(OptimizerManifest.isOptimizerManifest(optimizerManifest), '"optimizerManifest" is not a valid package');

    var pageBundles = new PageBundles();

    var bundlingStrategyFactory = bundlingStrategies[config.getBundlingStrategy() || 'default'];

    if (!bundlingStrategyFactory) {
        throw new Error('Invalid "bundlingStrategy": ' + config.getBundlingStrategy() + '. Expected: ' + Object.keys(bundlingStrategies).join(', '));
    }

    var bundlingStrategy = bundlingStrategyFactory(options, config, bundleMappings, pageBundles, optimizerContext);

    function buildPageBundles() {
        var asyncGroups = {};

        /**********************************************************************
         * STEP 1: Put all of the dependencies into bundles and keep track of *
         *         packages that are asynchronous.                            *
         **********************************************************************/
        function assignDependenciesToBundles() {
            var infoEnabled = logger.isInfoEnabled();
            var tree =  infoEnabled ? new DependencyTree() : null;
            optimizerContext.setPhase('page-bundle-mappings');

            return dependencyWalker.walk({
                    optimizerManifest: optimizerManifest,
                    enabledExtensions: enabledExtensions,
                    context: optimizerContext,
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

                            if (!dependency.read) {
                                return;
                            }

                            var bundle = bundlingStrategy.getBundleForSyncDependency(dependency, context);
                            if (bundle) {
                                // We know that the dependency is now actually part of the page
                                // (it wasn't just mapped into a bundle during configuration)
                                dependency.onAddToPageBundle(bundle, optimizerContext);

                                // At this point we have added the dependency to a bundle and we know the bundle is not asynchronous
                                pageBundles.addBundle(bundle);

                                if (tree) {
                                    tree.addToBundle(bundle, dependency, context.parentDependency);
                                }
                            }
                        }
                    }
                })
                .then(function() {
                    if (tree) {
                        logger.info('Page bundles:\n' + tree.bundlesToString());
                    }
                });
        } // End STEP 1

        /**********************************************************
         * STEP 2: Build asynchronous bundles and loader metadata *
         **********************************************************/
        function assignAsyncDependenciesToBundles() {
            optimizerContext.setPhase('async-page-bundle-mappings');
            
            var asyncPackageNames = Object.keys(asyncGroups);
            var loaderMeta = new LoaderMetadata(asyncPackageNames);
            var tree = logger.isInfoEnabled() ? new DependencyTree() : null;

            function handleAsyncGroup(asyncName, asyncDependencies) {
                // Since we are building the async bundles in parallel we need to create a new
                // optimizer context object, each with its own phaseData
                var nestedOptimizerContext = Object.create(optimizerContext);
                nestedOptimizerContext.phaseData = {};

                return dependencyWalker.walk({
                    dependencies: asyncDependencies,
                    enabledExtensions: enabledExtensions,
                    context: nestedOptimizerContext,
                    
                    on: {
                        dependency: function(d, context) {
                            // console.log('ASYNC DEPENDENCY: ', asyncName, d);
                            if (d.isPackageDependency()) {
                                if (tree) {
                                    tree.add(d, context.parentDependency);
                                }
                                return;
                            }

                            if (!d.read) {
                                logger.debug('Ignoring dependency because it is not readable', d);
                                return;
                            }


                            var bundle = bundlingStrategy.getBundleForAsyncDependency(d, context);
                            if (bundle) {
                                d.onAddToAsyncPageBundle(bundle, optimizerContext);
                                pageBundles.addAsyncBundle(bundle);
                                loaderMeta.addBundle(asyncName, bundle);

                                if (tree) {
                                    // Record that this bundle is an async bundle
                                    tree.addToBundle(bundle, d, context.parentDependency);
                                }
                            }
                        }
                    }
                });
            }

            var promises = [];

            for (var i = 0, len = asyncPackageNames.length; i < len; i++) {
                var asyncName = asyncPackageNames[i];
                var asyncDependencies = asyncGroups[asyncName];
                promises.push(handleAsyncGroup(asyncName, asyncDependencies));
            }

            return raptorPromises.all(promises).then(function() {
                if (tree) {
                    logger.info('Async page bundles:\n' + tree.bundlesToString());
                }
                optimizerContext.loaderMetadata = loaderMeta;
            });
        } // End STEP 2

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
