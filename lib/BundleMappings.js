var Bundle = require('./Bundle');
var nodePath = require('path');

var InlinePos = require('./InlinePos');

var BundleMappings = function(config, optimizerContext) {
    this.config = config;
    this.dependencyToBundleMapping = {};
    this.bundlesByKey = {};
    this.inPlaceDeploymentEnabled = config.isInPlaceDeploymentEnabled();
    this.bundlingEnabled = config.bundlingEnabled !== false;
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
        var key = dependency.getKey();
        var bundleMapping =  this.dependencyToBundleMapping[key];
        if (bundleMapping) {
            return bundleMapping;
        } else if (this.parentBundleMappings) {
            return this.parentBundleMappings.getBundleMappingForDependency(dependency);
        } else {
            return undefined;
        }
    },

    getBundleForDependency: function(dependency) {
        var key = dependency.getKey();
        var bundleMapping =  this.dependencyToBundleMapping[key];
        if (bundleMapping) {
            return bundleMapping.bundle;
        } else if (this.parentBundleMappings) {
            return this.parentBundleMappings.getBundleForDependency(dependency);
        } else {
            return undefined;
        }
    },
    
    removeBundleMapping: function(bundleMapping) {
        var dependency = bundleMapping.dependency;
        delete bundleMapping.bundleMappings.dependencyToBundleMapping[dependency.getKey()];
        bundleMapping.bundle.removeDependencyByIndex(bundleMapping.index);
    },
    
    addDependencyToBundle: function(dependency, targetBundleName, dependencySlot, bundleConfig) {
        var targetBundle;
        
        if (dependency.isPackageDependency()) {
            throw new Error('Illegal argument. Dependency cannot be a package dependency. Dependency: ' + dependency.toString());
        }
        
        var inlinePos = dependency.inline;

        if (inlinePos) {
            if (inlinePos === 'true' || inlinePos === true || inlinePos === 'end') {
                inlinePos = InlinePos.END;
            } else if (inlinePos === 'beginning') {
                inlinePos = InlinePos.BEGINNING;
            } else if (inlinePos === 'in-place') {
                inlinePos = InlinePos.IN_PLACE;
            } else {
                inlinePos = InlinePos.END;
            }
        }

        var bundleKey = Bundle.getKey(dependencySlot, dependency.getContentType(), inlinePos, targetBundleName);
        
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
        
        var index = targetBundle.addDependency(dependency);

        this.dependencyToBundleMapping[dependency.getKey()] = {
            // store the index of the dependency within the bundle
            index: index,

            // store the bundle associated with the mapping
            bundle: targetBundle,

            // store the bundle mapping
            bundleMappings: this,

            // store the dependency associated with the mapping
            dependency: dependency
        };
        
        return targetBundle;
    },

    addDependencyToPageBundle: function(dependency, pageBundleName, dependencySlot, bundleConfig) {
        if (dependency.isPackageDependency()) {
            throw new Error('Illegal argument. Dependency cannot be a package dependency. Dependency: ' + dependency.toString());
        }

        var bundle;

        if (this.inPlaceDeploymentEnabled && dependency.isInPlaceDeploymentAllowed()) {
            // Create a bundle with a single dependency for each dependency
            // that allows in-place deployment
            if (!dependency.getSourceFile) {
                throw new Error('getSourceFile() is required when in-place deployment is allowed. Dependency: ' + dependency);
            }

            bundle = this.addDependencyToBundle(dependency, dependency.getSourceFile(), dependencySlot, bundleConfig);
            bundle.dependency = dependency;
            bundle.inPlaceDeployment = true;
        } else if (dependency.isExternalResource()) {
            bundle = this.addDependencyToBundle(dependency, dependency.getUrl(), dependencySlot, bundleConfig);
            bundle.dependency = dependency;
            bundle.isExternalResource = true;
        } else if (this.bundlingEnabled === false) {
            var sourceFile;
            var relPath;

            if (dependency.getUnbundledTarget) {
                relPath = dependency.getUnbundledTarget();
            }

            if (!relPath && dependency.getSourceFile) {
                sourceFile = dependency.getSourceFile();

                if (sourceFile) {
                    var sourceDir = nodePath.dirname(sourceFile);

                    if (sourceDir.startsWith(this.config.getProjectRoot())) {
                        relPath = sourceFile.substring(this.config.getProjectRoot().length);
                    } else {
                        var modulePkg;
                        try {
                            modulePkg = require('raptor-modules/util').getModuleRootPackage(nodePath.dirname(sourceFile));
                        } catch(e) {

                        }
                        
                        if (modulePkg) {
                            var projectRoot = this.config.getProjectRoot();
                            relPath = sourceFile.substring(modulePkg.__dirname.length);
                            if (modulePkg.__dirname !== projectRoot) {
                                var name = modulePkg.name;
                                var version = modulePkg.version;
                                relPath = name + '-' + version + relPath;
                            }
                        }
                    }
                }
            }

            bundle = this.addDependencyToBundle(dependency, relPath || dependency.getKey(), dependencySlot);
            // bundle.dependency = dependency;
            if (relPath) {
                bundle.relativeOutputPath = relPath;
            }
        } else {
            //Make sure the dependency is part of a bundle. If it not part of a preconfigured bundle then put it in a page-specific bundle
            bundle = this.addDependencyToBundle(dependency, dependency.defaultBundleName || pageBundleName, dependencySlot, bundleConfig);
        }

        return bundle;
    },

    toString: function() {
        var lines = [];
        for (var k in this.dependencyToBundleMapping) {
            if (this.dependencyToBundleMapping.hasOwnProperty(k)) {
                var targetBundle = this.dependencyToBundleMapping[k].bundle;
                lines.push(k + ' --> ' + targetBundle.toString());
            }
        }

        return lines.join('\n');
    }
};
        
module.exports = BundleMappings;
