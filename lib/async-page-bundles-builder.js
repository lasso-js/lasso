var LoaderMetadata = require('./LoaderMetadata');
var dependencyWalker = require('./dependency-walker');
var raptorPromises = require('raptor-promises');
var DependencyTree = require('./DependencyTree');
var logger = require('raptor-logging').logger(module);

function buildAsyncPageBundles(pageBundleName, asyncDependencies, bundleMappings, pageBundles, context) {
    
    var loaderMeta = new LoaderMetadata(context);

    if (!asyncDependencies.length) {
        return raptorPromises.makePromise(loaderMeta);
    }

    var added = {};

    var queue = [];

    function enqueue(d) {
        if (!added[d.getKey()]) {
            added[d.getKey()] = true;
            queue.push(d);
        }
    }

    function dequeue() {
        if (queue.length) {
            return queue.shift();
        }
        else {
            return undefined;
        }
    }

    asyncDependencies.forEach(enqueue);

    var tree = new DependencyTree();

    function handleNextDependency() {
        var dependency = dequeue();
        if (!dependency) {
            return;
        }

        if (!dependency.getAsyncPathInfo) {
            throw new Error('Dependency of type "' + dependency.type + '" does not support asynchronous loading. Dependency: ' + dependency);
        }


        var asyncPathInfo = dependency.getAsyncPathInfo();
        if (asyncPathInfo.alias) {
            asyncPathInfo.aliasFrom = dependency.getParentManifestDir();
        }

        return dependencyWalker.walk({
            dependency: dependency,
            enabledExtensions: context.enabledExtensions,
            context: context,
            on: {
                'dependency': function(d, context) {
                    if (!context.async) {
                        throw new Error('Illegal state. Async dependency expected: ' + d); // All of the dependencies should be async
                    }

                    if (dependency !== d && d.async) {
                        enqueue(d);
                        return;
                    }

                    if (d.isManifestDependency()) {
                        tree.add(d, context.parentDependency);
                        return;
                    }

                    var bundle = bundleMappings.getBundleForDependency(d);

                    if (!bundle || !pageBundles.lookupBundle(bundle)) { //Check if this async dependency is part of a page bundle
                        
                        if (!bundle) {
                            // Create a new bundle for the dependency if one does not exist
                            bundle = bundleMappings.addDependencyToPageBundle(
                                d, 
                                pageBundleName, 
                                context.async, 
                                context.slot);

                            // Record that this bundle is an async bundle
                            tree.add(d, context.parentDependency);
                        }

                        pageBundles.addAsyncBundle(bundle);

                        loaderMeta.addBundle(asyncPathInfo, bundle);
                    }
                }
            }
        })
        .then(function() {
            if (queue.length) {
                return handleNextDependency();
            }
        });
    } // end handleNextDependency()

    return handleNextDependency()
        .then(function() {
            logger.info('Async page bundle "' + pageBundleName + '":\n' + tree.toString());
            context.loaderMetadata = loaderMeta;
        });
}

exports.buildAsyncPageBundles = buildAsyncPageBundles;