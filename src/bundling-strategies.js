const logger = require('raptor-logging').logger(module);

module.exports = {
    default: function(options, config, bundleMappings, pageBundles) {
        const pageName = options.name || options.pageName;
        const pageBundleName = pageName;
        const asyncPageBundleName = pageBundleName + '-async';

        return {
            getBundleForSyncDependency: function(dependency, walkContext, debugTree) {
                const lassoContext = walkContext.lassoContext;

                const infoEnabled = logger.isInfoEnabled();
                let bundleMapping = bundleMappings.getBundleMappingForDependency(dependency);

                if (bundleMapping && bundleMapping.bundle.isAsyncOnly()) {
                    if (infoEnabled) {
                        logger.info('Removing dependency ' + dependency + ' from bundle ' + bundleMapping.bundle);
                    }

                    // surgically remove the bundle from its existing mapping so that it can be
                    // rebundled into a page bundle
                    bundleMappings.removeBundleMapping(bundleMapping);
                    bundleMapping = null;
                }

                let bundle;

                // Has this dependency been mapped into a bundle and is the bundle willing to accept
                // non-asynchronous dependencies?
                if (bundleMapping) {
                    if (infoEnabled) {
                        logger.info('Dependency ' + dependency + ' already mapped to bundle ' + bundleMapping.bundle);
                    }

                    // pull the bundle out of the bundle mapping
                    bundle = bundleMapping.bundle;
                } else {
                    if (infoEnabled) {
                        logger.info('Dependency ' + dependency + ' is not mapped to a bundle');
                    }

                    // either the dependency was not configured to fall into a bundle
                    // or the bundle that it could have gone into is only for asynchronous
                    // dependencies. Either way, we need to go ahead and add a new page
                    // bundle for this dependency.
                    bundle = bundleMappings.addDependencyToPageBundle(
                        dependency,
                        pageBundleName,
                        walkContext.slot,
                        null,
                        lassoContext);
                }

                if (debugTree) {
                    debugTree.addToBundle(bundle, dependency, walkContext.parentDependency);
                }

                return bundle;
            },

            getBundleForAsyncDependency: function(dependency, walkContext, debugTree) {
                const lassoContext = walkContext.lassoContext;

                let bundle = bundleMappings.getBundleForDependency(dependency);
                if (bundle) {
                    if (pageBundles.lookupSyncBundle(bundle)) {
                        // This dependency has already been bundled with the page synchronously
                        // so don't return a new async bundle.
                        // Return null to indicate that this dependency does not belong
                        // to an async bundle.
                        return null;
                    }
                } else {
                    // Create a new bundle for the dependency if one does not exist
                    bundle = bundleMappings.addDependencyToPageBundle(
                        dependency,
                        asyncPageBundleName,
                        walkContext.slot,
                        null,
                        lassoContext);
                }

                if (debugTree) {
                    debugTree.addToBundle(bundle, dependency, walkContext.parentDependency);
                }

                return bundle;
            }
        };
    },

    lean: function(options, config, bundleMappings, pageBundles) {
        const BundleMappings = require('./BundleMappings');
        const pageName = options.name || options.pageName;
        const pageBundleName = pageName;
        const asyncPageBundleName = pageBundleName + '-async';
        const pageBundleMappings = new BundleMappings(config, pageName);

        return {
            getBundleForSyncDependency: function(dependency, walkContext, debugTree) {
                const lassoContext = walkContext.lassoContext;

                // find the bundle that was configured for dependency
                const bundleMapping = bundleMappings.getBundleMappingForDependency(dependency);

                let bundle;

                if (bundleMapping && !bundleMapping.bundle.isAsyncOnly()) {
                    bundle = pageBundleMappings.addDependencyToPageBundle(
                        dependency,
                        bundleMapping.bundle.getName(),
                        walkContext.slot,
                        bundleMapping.bundle.getConfig(),
                        lassoContext);
                } else {
                    bundle = pageBundleMappings.addDependencyToPageBundle(
                        dependency,
                        pageBundleName,
                        walkContext.slot,
                        null,
                        lassoContext);
                }

                if (debugTree) {
                    debugTree.addToBundle(bundle, dependency, walkContext.parentDependency);
                }

                return bundle;
            },

            getBundleForAsyncDependency: function(dependency, walkContext, debugTree) {
                const lassoContext = walkContext.lassoContext;
                let bundle = pageBundleMappings.getBundleForDependency(dependency);
                if (bundle) {
                    if (pageBundles.lookupSyncBundle(bundle)) {
                        // This dependency has already been bundled with the page synchronously
                        // so don't add it to an async bundle.
                        // Return null to indicate that this dependency does not belong
                        // to an async bundle.
                        return null;
                    }
                } else {
                    // this dependency has not been bundled yet
                    const bundleMapping = bundleMappings.getBundleMappingForDependency(dependency);
                    if (bundleMapping) {
                        // this dependency has been mapped into a bundle
                        const bundleName = bundleMapping.bundle.isAsyncOnly() ? bundleMapping.bundle.getName() : bundleMapping.bundle.getName() + '-async';
                        bundle = pageBundleMappings.addDependencyToPageBundle(
                            dependency,
                            bundleName,
                            walkContext.slot,
                            bundleMapping.bundle.getConfig(),
                            lassoContext);
                    } else {
                        bundle = pageBundleMappings.addDependencyToPageBundle(
                            dependency,
                            asyncPageBundleName,
                            walkContext.slot,
                            null,
                            lassoContext);
                    }

                    if (debugTree) {
                        debugTree.addToBundle(bundle, dependency, walkContext.parentDependency);
                    }
                }

                return bundle;
            }
        };
    }
};
