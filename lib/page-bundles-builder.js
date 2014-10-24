var PageBundles = require('./PageBundles');
var dependencyWalker = require('./dependency-walker');
var assert = require('assert');
var OptimizerManifest = require('./OptimizerManifest');
var LoaderMetadata = require('./LoaderMetadata');
var DependencyTree = require('./DependencyTree');
var logger = require('raptor-logging').logger(module);
var bundlingStrategies = require('./bundling-strategies');

function build(options, config, bundleMappings, optimizerContext, callback) {
    assert.ok(options, '"options" is required');
    assert.ok(config, '"config" is required');
    assert.ok(bundleMappings, '"bundleMappings" is required');
    assert.ok(optimizerContext, '"optimizerContext" is required');
    assert.ok(typeof callback === 'function', 'callback function is required');

    var pageName = options.name || options.pageName;

    var optimizerManifest = options.optimizerManifest;
    var flags = optimizerContext.flags;

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
    }, function(task, callback) {
        // this function is called when we need to run task

        var asyncPackageName = task.asyncPackageName;
        var debugTree = logger.isDebugEnabled() ? new DependencyTree() : null;

        // register this async package name in loader metadata
        loaderMetadata.addAsyncPackageName(asyncPackageName);

        // Since we are building the async bundles in parallel we need to create a new
        // optimizer context object, each with its own phaseData
        var nestedOptimizerContext = Object.create(optimizerContext);
        nestedOptimizerContext.phaseData = {};

        if (infoEnabled) {
            logger.info('Building async package "' + asyncPackageName + '"...');
        }

        return dependencyWalker.walk({
            dependencies: task.dependencies,
            flags: flags,
            optimizerContext: nestedOptimizerContext,
            on: {
                // as we're building async packages, we need to watch for new async packages
                manifest: handleManifest,

                dependency: function(d, walkContext) {
                    if (d.isPackageDependency()) {
                        if (debugTree) {
                            debugTree.add(d, walkContext.parentDependency);
                        }
                        return;
                    }

                    if (!d.read) {
                        logger.debug('Ignoring dependency because it is not readable', d);
                        return;
                    }

                    var bundle = bundlingStrategy.getBundleForAsyncDependency(d, walkContext, debugTree);
                    if (bundle) {
                        d.onAddToAsyncPageBundle(bundle, optimizerContext);
                        pageBundles.addAsyncBundle(bundle);
                        loaderMetadata.addBundle(asyncPackageName, bundle);
                    }
                }
            }
        }, function(err) {
            // we're done walking async dependencies for this async package
            if (debugTree) {
                logger.debug('Async page bundles for "' + asyncPackageName + '":\n' + debugTree.bundlesToString());
            }

            if (err) {
                logger.error('Error building bundles for async package "' + asyncPackageName + '"', err);
            } else {
                logger.info('Built async package "' + asyncPackageName + '".');
            }

            // let the work-queue know that this job is done
            callback(err);
        });
    });

    // this will keep track of async loader metadata
    var loaderMetadata = optimizerContext.loaderMetadata = new LoaderMetadata();

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
    function buildSyncPageBundles(callback) {

        var debugTree = logger.isDebugEnabled() ? new DependencyTree() : null;
        optimizerContext.setPhase('page-bundle-mappings');

        dependencyWalker.walk({
            optimizerManifest: optimizerManifest,
            flags: flags,
            optimizerContext: optimizerContext,
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

                    var bundle = bundlingStrategy.getBundleForSyncDependency(dependency, walkContext, debugTree);
                    if (bundle) {
                        // We know that the dependency is now actually part of the page
                        // (it wasn't just mapped into a bundle during configuration)
                        dependency.onAddToPageBundle(bundle, optimizerContext);

                        // At this point we have added the dependency to a bundle and we know the bundle is not asynchronous
                        pageBundles.addSyncBundle(bundle);
                    }
                }
            }
        }, function(err) {
            if (debugTree) {
                logger.debug('Page bundles:\n' + debugTree.bundlesToString());
            }

            callback(err);
        });
    }

    buildSyncPageBundles(function(err) {
        if (err) {
            return callback(err);
        }

        optimizerContext.setPhase('async-page-bundle-mappings');
        if (buildAsyncPackagesWorkQueue.idle()) {
            // no async packages so resolve promise
            callback(null, pageBundles);
        } else {
            // start the work to build bundles for async packages
            buildAsyncPackagesWorkQueue.resume();
        }
    });
}

exports.build = build;
