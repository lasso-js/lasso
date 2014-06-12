var LoaderMetadata = require('./LoaderMetadata');
var dependencyWalker = require('./dependency-walker');
var raptorPromises = require('raptor-promises');
var DependencyTree = require('./DependencyTree');
var logger = require('raptor-logging').logger(module);

function buildAsyncPageBundles(pageBundleName, asyncGroups, bundleMappings, pageBundles, context) {
    
    var loaderMeta = new LoaderMetadata(context);
    var tree = logger.isInfoEnabled() ? new DependencyTree() : null;

    function handleAsyncGroup(asyncName, asyncDependencies) {
        return dependencyWalker.walk({
            dependencies: asyncDependencies,
            enabledExtensions: context.enabledExtensions,
            context: context,
            shouldSkipDependency: function(dependency) {
                if (!dependency.isPackageDependency() && !dependency.read) {
                    // ignore non-readable dependencies during bundling phase
                    return true;
                }

                return false;
            },
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

                    var bundle = bundleMappings.getBundleForDependency(d);

                    if (!bundle || !pageBundles.lookupBundle(bundle)) { //Check if this async dependency is part of a page bundle
                        
                        if (!bundle) {
                            // Create a new bundle for the dependency if one does not exist
                            bundle = bundleMappings.addDependencyToPageBundle(
                                d,
                                pageBundleName,
                                context.slot);

                            if (tree) {
                                // Record that this bundle is an async bundle
                                tree.addToBundle(bundle, d, context.parentDependency);
                            }
                        }

                        // console.log('ASYNC DEPENDENCY BUNDLE: ', asyncName, d, bundle.toString(), tree.bundlesToString());

                        pageBundles.addAsyncBundle(bundle);
                        loaderMeta.addBundle(asyncName, bundle);
                    }
                }
            }
        });
    }

    var promises = [];
    for (var asyncName in asyncGroups) {
        if (asyncGroups.hasOwnProperty(asyncName)) {
            var asyncDependencies = asyncGroups[asyncName];
            promises.push(handleAsyncGroup(asyncName, asyncDependencies));
        }
    }

    return raptorPromises.all(promises).then(function() {
        if (tree) {
            logger.info('Async page bundles:\n' + tree.bundlesToString());
        }
        context.loaderMetadata = loaderMeta;
    });
}

exports.buildAsyncPageBundles = buildAsyncPageBundles;