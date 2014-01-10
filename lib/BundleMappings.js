var logger = require('raptor-logging').logger(module);
var promises = require('raptor-promises');
var dependencyWalker = require('./dependency-walker');
var DependencyTree = require('./DependencyTree');
var Bundle = require('./Bundle');

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

    addDependenciesToBundle: function(dependencies, targetBundleName, bundleConfig) {
        var _this = this;
        var promiseChain = promises.resolved();
        var tree = new DependencyTree();

        dependencies.forEach(function(d) {
            promiseChain = promiseChain.then(function() {
                return dependencyWalker.walk({
                    context: this.context,
                    dependency: d,
                    enabledExtensions: this.enabledExtensions,
                    buildTree: true,
                    on: {
                        'dependency': function(dependency, context) {
                            

                            if (dependency.isManifestDependency()) {
                                tree.add(dependency, context.parentDependency);
                                // We are only interested in non-package dependencies
                                return;
                            }

                            if (context.async) {
                                if (context.skipPackage) {
                                    context.skipPackage(); // Don't bother recursing into async modules
                                }
                                // Async dependencies cannot be added to bundles
                                return;
                            }

                            if (_this.getBundleForDependency(dependency)) {
                                // The dependency has already been added to another bundle
                                return;
                            }

                            _this.addDependencyToBundle(dependency, targetBundleName, context.slot, bundleConfig);
                            tree.add(dependency, context.parentDependency);
                        },

                        'package': function(pkg, dependency, context) {
                            
                        }
                    }
                });
            });
        });

        return promiseChain
            .then(function() {
                logger.info('Bundle "' + targetBundleName + '":\n' + tree.toString());
            });
    },
    
    addDependencyToBundle: function(dependency, targetBundleName, dependencySlot, bundleConfig) {
        var targetBundle;
        
        if (dependency.isManifestDependency()) {
            throw new Error("Illegal argument. Dependency cannot be a package dependency. Dependency: " + dependency.toString());
        }
        
        var inline = dependency.inline === true;



        var bundleKey = dependencySlot + "/" + dependency.getContentType() + "/" + inline + "/" + targetBundleName;
        targetBundle = this.bundlesByKey[bundleKey];

        if (!targetBundle) {
            targetBundle = new Bundle(targetBundleName);
            targetBundle.setInline(inline);
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

    addDependencyToPageBundle: function(dependency, pageBundleName, async, slot) {
        if (dependency.isManifestDependency()) {
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
            bundle = this.addDependencyToBundle(dependency, dependency.getKey(), slot);
            bundle.dependency = dependency;
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