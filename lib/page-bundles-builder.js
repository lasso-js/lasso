var PageBundles = require('./PageBundles');
var dependencyWalker = require('./dependency-walker');
var assert = require('assert');
var LassoManifest = require('./LassoManifest');
var LoaderMetadata = require('./LoaderMetadata');
var DependencyTree = require('./DependencyTree');
var logger = require('raptor-logging').logger(module);
var bundlingStrategies = require('./bundling-strategies');

async function build (options, config, bundleMappings, lassoContext) {
    // TODO: Change to fully use async/await
    assert.ok(options, '"options" is required');
    assert.ok(config, '"config" is required');
    assert.ok(bundleMappings, '"bundleMappings" is required');
    assert.ok(lassoContext, '"lassoContext" is required');

    var pageName = options.name || options.pageName;
    var lassoManifest = options.lassoManifest;
    var flags = lassoContext.flags;

    assert.ok(pageName, 'page name is required');
    assert.ok(typeof pageName === 'string', 'page name should be a string');
    assert.ok(lassoManifest, '"lassoManifest" is required');
    assert.ok(LassoManifest.isLassoManifest(lassoManifest), '"lassoManifest" is not a valid package');

    return new Promise(async (resolve, reject) => {
        function callback (err, data) {
            return err ? reject(err) : resolve(data);
        }

        // this will keep track of async loader metadata
        var loaderMetadata = lassoContext.loaderMetadata = new LoaderMetadata();

        var pageBundles = new PageBundles();

        var bundlingStrategyFactory = bundlingStrategies[config.getBundlingStrategy() || 'default'];

        if (!bundlingStrategyFactory) {
            throw new Error('Invalid "bundlingStrategy": ' + config.getBundlingStrategy() + '. Expected: ' + Object.keys(bundlingStrategies).join(', '));
        }

        var bundlingStrategy = bundlingStrategyFactory(options, config, bundleMappings, pageBundles, lassoContext);

        var infoEnabled = logger.isInfoEnabled();

        var foundAsyncPackages = {};

        // as we discover new manifests with "async" property, we add tasks to work queue
        // that will be later used to build each async package
        var buildAsyncPackagesWorkQueue = require('raptor-async/work-queue').create({
            // task caused error
            onTaskError: function(err) {
                // on error, clear the queue of any tasks
                buildAsyncPackagesWorkQueue.kill();
                callback(err);
            },

            onTaskComplete: function() {
                if (buildAsyncPackagesWorkQueue.idle()) {
                    // no more work so done
                    callback(null, pageBundles);
                }
            }
        }, async function (task, callback) {
            // this function is called when we need to run task

            var asyncPackageName = task.asyncPackageName;
            var debugTree = logger.isDebugEnabled() ? new DependencyTree() : null;

            // register this async package name in loader metadata
            loaderMetadata.addAsyncPackageName(asyncPackageName);

            // Since we are building the async bundles in parallel we need to create a new
            // lasso context object, each with its own phaseData
            var nestedLassoContext = Object.create(lassoContext);
            nestedLassoContext.phaseData = {};

            if (infoEnabled) {
                logger.info('Building async package "' + asyncPackageName + '"...');
            }

            try {
                await dependencyWalker.walk({
                    dependencies: task.dependencies,
                    flags: flags,
                    lassoContext: nestedLassoContext,
                    on: {
                        // as we're building async packages, we need to watch for new async packages
                        manifest: handleManifest,

                        dependency: function(dependency, walkContext) {
                            if (dependency.isPackageDependency()) {
                                if (debugTree) {
                                    debugTree.add(dependency, walkContext.parentDependency);
                                }
                                return;
                            }

                            if (!dependency.read) {
                                logger.debug('Ignoring dependency because it is not readable', dependency);
                                return;
                            }

                            // NOTE: walkContext will contain everything that is interesting including the following:
                            // - dependency
                            // - slot
                            // - dependencyChain
                            lassoContext.emit('beforeAddDependencyToAsyncPageBundle', walkContext);

                            var bundle = bundlingStrategy.getBundleForAsyncDependency(dependency, walkContext, debugTree);
                            if (bundle) {
                                dependency.onAddToAsyncPageBundle(bundle, lassoContext);
                                pageBundles.addAsyncBundle(bundle);
                                loaderMetadata.addBundle(asyncPackageName, bundle);
                            }
                        }
                    }
                });

                // we're done walking async dependencies for this async package
                if (debugTree) {
                    logger.debug('Async page bundles for "' + asyncPackageName + '":\n' + debugTree.bundlesToString());
                }
            } catch (err) {
                logger.error('Error building bundles for async package "' + asyncPackageName + '"', err);
                return callback(err);
            }

            logger.info('Built async package "' + asyncPackageName + '".');
            callback();
        });

        // When walking a manifest, we need to check if the manifest has an "async" property
        // which declares asynchronous packages
        function handleManifest(manifest, walkContext) {
            var async = manifest.async;
            if (async) {
                // create jobs to build each async package
                for (var asyncName in async) {
                    if (async.hasOwnProperty(asyncName)) {
                        if (!foundAsyncPackages.hasOwnProperty(asyncName)) {
                            foundAsyncPackages[asyncName] = true;
                            buildAsyncPackagesWorkQueue.push({
                                asyncPackageName: asyncName,
                                dependencies: async[asyncName]
                            });
                        }
                    }
                }
            }
        }

        /**********************************************************************
         * STEP 1: Put all of the dependencies into bundles and keep track of *
         *         packages that are asynchronous.                            *
         **********************************************************************/
        async function buildSyncPageBundles () {
            var debugTree = logger.isDebugEnabled() ? new DependencyTree() : null;
            lassoContext.setPhase('page-bundle-mappings');

            await dependencyWalker.walk({
                lassoManifest: lassoManifest,
                flags: flags,
                lassoContext: lassoContext,
                on: {
                    manifest: handleManifest,
                    dependency: function(dependency, walkContext) {
                        if (dependency.isPackageDependency()) {
                            if (debugTree) {
                                debugTree.add(dependency, walkContext.parentDependency);
                            }

                            // We are only interested in the actual dependencies (not ones that resolve to more dependencies)
                            return;
                        }

                        if (!dependency.read) {
                            return;
                        }

                        // NOTE: walkContext will contain everything that is interesting including the following:
                        // - dependency
                        // - slot
                        // - dependencyChain
                        lassoContext.emit('beforeAddDependencyToSyncPageBundle', walkContext);

                        var bundle = bundlingStrategy.getBundleForSyncDependency(dependency, walkContext, debugTree);
                        if (bundle) {
                            // We know that the dependency is now actually part of the page
                            // (it wasn't just mapped into a bundle during configuration)
                            dependency.onAddToPageBundle(bundle, lassoContext);

                            // At this point we have added the dependency to a bundle and we know the bundle is not asynchronous
                            pageBundles.addSyncBundle(bundle);
                        }
                    }
                }
            });

            if (debugTree) {
                logger.debug('Page bundles:\n' + debugTree.bundlesToString());
            }
        }

        try {
            await buildSyncPageBundles();
        } catch (err) {
            return callback(err);
        }

        lassoContext.setPhase('async-page-bundle-mappings');
        if (buildAsyncPackagesWorkQueue.idle()) {
            callback(null, pageBundles);
        } else {
            // start the work to build bundles for async packages
            buildAsyncPackagesWorkQueue.resume();
        }
    });
}

exports.build = build;
