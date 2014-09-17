var logger = require('raptor-logging').logger(module);

module.exports = {
    'default': function(options, config, bundleMappings, pageBundles, optimizerContext) {

        var pageName = options.name || options.pageName;
        var pageBundleName = pageName.replace(/^[^A-Za-z0-9_\-\.]*/g, '');
        var asyncPageBundleName = pageBundleName + '-async';

        return {
            getBundleForSyncDependency: function(dependency, walkContext) {
                var infoEnabled = logger.isInfoEnabled();
                var bundleMapping = bundleMappings.getBundleMappingForDependency(dependency);

                if (bundleMapping && bundleMapping.bundle.isAsyncOnly()) {
                    if (infoEnabled) {
                        logger.info('Removing dependency ' + dependency + ' from bundle ' + bundleMapping.bundle);
                    }

                    // surgically remove the bundle from its existing mapping so that it can be
                    // rebundled into a page bundle
                    bundleMappings.removeBundleMapping(bundleMapping);
                    bundleMapping = null;
                }

                var bundle;

                // Has this dependency been mapped into a bundle and is the bundle willing to accept
                // non-asynchronous dependencies?
                if (bundleMapping) {
                    if (infoEnabled) {
                        logger.info('Dependency ' + dependency+ ' already mapped to bundle ' + bundleMapping.bundle);
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
                        walkContext.slot);
                }

                return bundle;
            },

            getBundleForAsyncDependency: function(dependency, walkContext) {
                var bundle = bundleMappings.getBundleForDependency(dependency);
                if (bundle && pageBundles.lookupBundle(bundle)) {
                    // bundle has already been added to page bundles so don't return
                    // a new async bundle
                    return null;
                }

                // Either the dependency doesn't have a bundle or
                // the bundle that it belongs to is not part of the
                // page bundles so it's safe to add as an asynchronous dependency

                if (!bundle) {
                    // Create a new bundle for the dependency if one does not exist
                    bundle = bundleMappings.addDependencyToPageBundle(
                        dependency,
                        asyncPageBundleName,
                        walkContext.slot);
                }

                return bundle;
            }
        };
    }
};