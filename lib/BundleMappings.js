var Bundle = require('./Bundle');
var nodePath = require('path');

var InlinePos = require('./InlinePos');

var BundleMappings = function(config, context) {
    context = context || {};
    this.config = config;
    this.context = context;
    this.enabledExtensions = context.enabledExtensions;
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

        this.parentBundleMappings = parentBundleMappings;
    },
    
    getBundleForDependency: function(dependency) {
        var key = dependency.getKey();
        var bundle =  this.dependencyToBundleMapping[key];
        if (bundle) {
            return bundle;
        }
        else if (this.parentBundleMappings) {
            return this.parentBundleMappings.getBundleForDependency(dependency);
        }
        else {
            return undefined;
        }
    },
    
    getEnabledExtensions: function() {
        return this.enabledExtensions;
    },
    
    addDependencyToBundle: function(dependency, targetBundleName, dependencySlot, bundleConfig) {
        var targetBundle;
        
        if (dependency.isPackageDependency()) {
            throw new Error("Illegal argument. Dependency cannot be a package dependency. Dependency: " + dependency.toString());
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
            targetBundle.setUrl(dependency.url);
            if (bundleConfig) {
                targetBundle.setConfig(bundleConfig);
            }
            
            this.bundlesByKey[bundleKey] = targetBundle;
        }
        
        this.dependencyToBundleMapping[dependency.getKey()] = targetBundle;

        targetBundle.addDependency(dependency);
        
        return targetBundle;
    },

    addDependencyToPageBundle: function(dependency, pageBundleName, slot) {
        if (dependency.isPackageDependency()) {
            throw new Error("Illegal argument. Dependency cannot be a package dependency. Dependency: " + dependency.toString());
        }

        var bundle;

        if (this.inPlaceDeploymentEnabled && dependency.isInPlaceDeploymentAllowed()) {
            // Create a bundle with a single dependency for each dependency
            // that allows in-place deployment
            if (!dependency.getSourceFile) {
                throw new Error('getSourceFile() is required when in-place deployment is allowed. Dependency: ' + dependency);
            }

            bundle = this.addDependencyToBundle(dependency, dependency.getSourceFile(), slot);
            bundle.dependency = dependency;
            bundle.inPlaceDeployment = true;
        }

        if (!bundle && dependency.isExternalResource()) {
            bundle = this.addDependencyToBundle(dependency, dependency.getUrl(), slot);
            bundle.dependency = dependency;
            bundle.isExternalResource = true;
        }
        
        if (!bundle && this.bundlingEnabled === false) {
            var sourceFile;
            var relPath;

            if (dependency.getSourceFile) {
                sourceFile = dependency.getSourceFile();

                if (sourceFile) {
                    var modulePkg = require('raptor-modules/util').getModuleRootPackage(nodePath.dirname(sourceFile));
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

            bundle = this.addDependencyToBundle(dependency, relPath || dependency.getKey(), slot);
            // bundle.dependency = dependency;
            if (relPath) {
                bundle.relativeOutputPath = relPath;
            }
        }
        
        if (!bundle) {
            //Make sure the dependency is part of a bundle. If it not part of a preconfigured bundle then put it in a page-specific bundle
            bundle = this.addDependencyToBundle(dependency, pageBundleName, slot);
        }

        return bundle;
    },

    toString: function() {
        var lines = [];
        for (var k in this.dependencyToBundleMapping) {
            if (this.dependencyToBundleMapping.hasOwnProperty(k)) {
                var targetBundle = this.dependencyToBundleMapping[k];
                lines.push(k + ' --> ' + targetBundle.toString());
            }
        }

        return lines.join('\n');
    }
};
        
module.exports = BundleMappings;