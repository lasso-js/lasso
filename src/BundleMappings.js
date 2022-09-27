const Bundle = require('./Bundle');
const InlinePos = require('./InlinePos');
const EventEmitter = require('events').EventEmitter;
const ok = require('assert').ok;
const hasOwn = Object.prototype.hasOwnProperty;

function safeRelativePath(path) {
    return path.replace(/[^A-Za-z0-9_.\-\/\\$@]/g, '_');
}

function BundleMappings(config, pageName) {
    BundleMappings.$super.call(this);

    ok(pageName == null || typeof pageName === 'string', 'pageName should be a String');

    this.config = config;
    this.dependencyToBundleMapping = {};
    this.bundlesByKey = {};
    this.inPlaceDeploymentEnabled = config.isInPlaceDeploymentEnabled();
    this.bundlingEnabled = config.bundlingEnabled !== false;
    this.pageName = pageName;
};

BundleMappings.prototype = {
    __BundleMappings: true,

    setParentBundleMappings: function(parentBundleMappings) {
        if (parentBundleMappings && !parentBundleMappings.__BundleMappings) {
            throw new Error('Invalid parent bundle mappings');
        }

        if (parentBundleMappings === this) {
            throw new Error('parent bundle mappings cannot be self');
        }

        // The parent bundle mappings are those defined at configuration time
        // and we may not have actually
        this.parentBundleMappings = parentBundleMappings;
    },

    getBundleMappingForDependency: function(dependency) {
        const key = dependency.getKey();
        const bundleMapping = this.dependencyToBundleMapping[key];
        if (bundleMapping) {
            return bundleMapping;
        } else if (this.parentBundleMappings) {
            return this.parentBundleMappings.getBundleMappingForDependency(dependency);
        } else {
            return undefined;
        }
    },

    getBundleForDependency: function(dependency) {
        const key = dependency.getKey();
        const bundleMapping = this.dependencyToBundleMapping[key];
        if (bundleMapping) {
            return bundleMapping.bundle;
        } else if (this.parentBundleMappings) {
            return this.parentBundleMappings.getBundleForDependency(dependency);
        } else {
            return undefined;
        }
    },

    removeBundleMapping: function(bundleMapping) {
        const dependency = bundleMapping.dependency;
        delete bundleMapping.bundleMappings.dependencyToBundleMapping[dependency.getKey()];
        bundleMapping.bundle.removeDependencyByIndex(bundleMapping.index);
    },

    addDependencyToBundle: function(dependency, targetBundleName, dependencySlot, bundleConfig, lassoContext) {
        ok(lassoContext, 'lassoContext expected');

        let targetBundle;

        if (dependency.isPackageDependency()) {
            throw new Error('Illegal argument. Dependency cannot be a package dependency. Dependency: ' + dependency.toString());
        }

        let inlinePos = dependency.inline;

        if (inlinePos != null) {
            if (inlinePos === 'true' || inlinePos === true || inlinePos === 'end') {
                inlinePos = InlinePos.END;
            } else if (inlinePos === 'beginning') {
                inlinePos = InlinePos.BEGINNING;
            } else if (inlinePos === 'in-place') {
                inlinePos = InlinePos.IN_PLACE;
            } else if (inlinePos === 'false' || inlinePos === false) {
                // normalize false to undefined (really no need to set inline to false since it is the default)
                inlinePos = undefined;
            } else {
                throw new Error('Invalid value for "inline": ' + inlinePos);
            }
        }

        const bundleKey = Bundle.getKey(dependencySlot, dependency.getContentType(), inlinePos, targetBundleName);

        targetBundle = this.bundlesByKey[bundleKey];

        if (!targetBundle) {
            targetBundle = new Bundle(targetBundleName);
            targetBundle.key = bundleKey;
            targetBundle.setInlinePos(inlinePos);
            targetBundle.setSlot(dependencySlot);
            targetBundle.setContentType(dependency.getContentType());
            targetBundle.setUrl(dependency.getUrl ? dependency.getUrl() : dependency.url);
            if (bundleConfig) {
                targetBundle.setConfig(bundleConfig);
            }

            this.bundlesByKey[bundleKey] = targetBundle;
        }

        const index = targetBundle.addDependency(dependency);

        const bundleMapping = {
            // store the index of the dependency within the bundle
            index,

            // store the bundle associated with the mapping
            bundle: targetBundle,

            // store the bundle mapping
            bundleMappings: this,

            // store the dependency associated with the mapping
            dependency
        };

        this.dependencyToBundleMapping[dependency.getKey()] = bundleMapping;

        dependency.emit('addedToBundle', {
            bundle: targetBundle,
            lassoContext
        });

        return targetBundle;
    },

    addDependencyToPageBundle: function(dependency, pageBundleName, dependencySlot, bundleConfig, lassoContext) {
        ok(lassoContext, 'lassoContext expected');

        if (dependency.isPackageDependency()) {
            throw new Error('Illegal argument. Dependency cannot be a package dependency. Dependency: ' + dependency.toString());
        }

        let bundle;
        const defaultBundleName = dependency.getDefaultBundleName(pageBundleName, lassoContext);
        const flags = lassoContext.flags;

        if (this.inPlaceDeploymentEnabled && dependency.isInPlaceDeploymentAllowed()) {
            // Create a bundle with a single dependency for each dependency
            // that allows in-place deployment
            if (!dependency.getSourceFile) {
                throw new Error('getSourceFile() is required when in-place deployment is allowed. Dependency: ' + dependency);
            }

            bundle = this.addDependencyToBundle(
                dependency,
                dependency.getSourceFile(),
                dependencySlot,
                bundleConfig,
                lassoContext);

            bundle.dependency = dependency;
            bundle.inPlaceDeployment = true;
        } else if (dependency.isExternalResource()) {
            bundle = this.addDependencyToBundle(
                dependency,
                dependency.getUrl(),
                dependencySlot,
                bundleConfig,
                lassoContext);

            bundle.dependency = dependency;
            bundle.isExternalResource = true;
        } else if (this.bundlingEnabled === false) {
            // Bundling is NOT enabled

            // We will try to find a relative path that will be used for
            // the output file of the bundle.
            // This relative path might be different from the bundle name
            // if a defaultBundleName is provided
            //
            // NOTE: If we don't have a defaultBundleName for this dependency
            // and if we don't find a relative path then we will use
            // `${dependencyType}-${pageBundleName}` as the
            // bundle name.

            let targetBundle;

            if (dependency.getUnbundledTarget) {
                targetBundle = dependency.getUnbundledTarget(lassoContext);
            }

            if (!targetBundle && dependency.getSourceFile) {
                const sourceFile = dependency.getSourceFile();

                if (sourceFile) {
                    targetBundle = lassoContext.getClientPath(sourceFile);
                }
            }

            if (targetBundle) {
                targetBundle = safeRelativePath(targetBundle);

                let prefix = pageBundleName.replace(/[\\\/]/g, '-');

                if (flags && !flags.isEmpty()) {
                    prefix += '-' + flags.getKey();
                }

                if (dependency.getUnbundledTargetPrefix) {
                    const unbundledTargetPrefix = dependency.getUnbundledTargetPrefix(lassoContext);
                    if (unbundledTargetPrefix) {
                        prefix += '/' + unbundledTargetPrefix;
                    }
                }

                targetBundle = prefix + '/' + targetBundle;
            }

            let finalBundleName = defaultBundleName || targetBundle;
            if (!finalBundleName) {
                finalBundleName = dependency.type + '-' + pageBundleName;

                if (flags && !flags.isEmpty()) {
                    finalBundleName += '-' + flags.getKey();
                }
            }

            bundle = this.addDependencyToBundle(
                dependency,
                finalBundleName,
                dependencySlot,
                null,
                lassoContext);

            // bundle.dependency = dependency;
            if (targetBundle) {
                // We associate this bundle with a relative path which will
                // be used as the output file for the bundle
                bundle.relativeOutputPath = targetBundle;
            }
        } else {
            // Bundling is enabled
            // Make sure the dependency is part of a bundle. If it not part of a preconfigured bundle then put it in a page-specific bundle
            bundle = this.addDependencyToBundle(
                dependency,
                defaultBundleName || pageBundleName,
                dependencySlot,
                bundleConfig,
                lassoContext);
        }

        return bundle;
    },

    toString: function() {
        const lines = [];
        for (const k in this.dependencyToBundleMapping) {
            if (hasOwn.call(this.dependencyToBundleMapping, k)) {
                const targetBundle = this.dependencyToBundleMapping[k].bundle;
                lines.push(k + ' --> ' + targetBundle.toString());
            }
        }

        return lines.join('\n');
    }
};

require('raptor-util').inherit(BundleMappings, EventEmitter);

module.exports = BundleMappings;
