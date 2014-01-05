var logger = require('raptor-logging').logger(module);
var promises = require('raptor-promises');
var dependencyWalker = require('./dependency-walker');
var DependencyTree = require('./DependencyTree');
var Bundle = require('./Bundle');
var File = require('raptor-files/File');

var BundleMappings = function(config, context) {
    context = context || {};
    this.config = config;
    this.context = context;
    this.enabledExtensions = context.enabledExtensions;
    this.dependencyToBundleMapping = {};
    this.bundlesByKey = {};

    this.inPlaceDeploymentEnabled = config.inPlaceDeploymentEnabled === true;
    this.bundlingEnabled = config.bundlingEnabled !== false;
    this.checksumsEnabled = config.checksumsEnabled;
    this.sourceUrlResolver = config.hasServerSourceMappings() ?
        function(path) {
            return config.getUrlForSourceFile(path);
        } :
        null;
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

    addDependenciesToBundle: function(dependencies, targetBundleName, checksumsEnabled, wrappers) {
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
                                return;
                            }

                            _this.addDependencyToBundle(dependency, targetBundleName, checksumsEnabled, context.slot, wrappers);
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
    
    addDependencyToBundle: function(dependency, targetBundleName, checksumsEnabled, dependencySlot, wrappers) {
        var targetBundle;
        
        if (dependency.isManifestDependency()) {
            throw new Error("Illegal argument. Dependency cannot be a package dependency. Dependency: " + dependency.toString());
        }
        
        var inline = dependency.inline === true;



        var bundleKey = dependencySlot + "/" + dependency.getContentType() + "/" + inline + "/" + targetBundleName;
        targetBundle = this.bundlesByKey[bundleKey];

        if (!targetBundle) {
            targetBundle = new Bundle(targetBundleName);
            targetBundle.checksumsEnabled = checksumsEnabled;
            targetBundle.setInline(inline);
            targetBundle.setSlot(dependencySlot);
            targetBundle.setContentType(dependency.getContentType());
            targetBundle.setUrl(dependency.url);
            targetBundle.setWrappers(wrappers);

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
        
        // this dependency has not been mapped to a bundle yet
        var sourceResource = dependency.getInPlaceFile && dependency.getInPlaceFile();

        if (typeof sourceResource === 'string') {
            sourceResource = new File(sourceResource);
        }
        
        if (this.inPlaceDeploymentEnabled) {
            //Create a bundle with a single dependency for each dependency
            if (dependency.isInPlaceDeploymentAllowed() && sourceResource && sourceResource.exists()) {
                
                var sourceUrl;
                
                if (this.sourceUrlResolver) {
                    sourceUrl = this.sourceUrlResolver(sourceResource.getAbsolutePath());
                }
                
                if (!this.sourceUrlResolver || sourceUrl) {
                    bundle = this.addDependencyToBundle(dependency, sourceResource.toURL(), undefined, slot);
                    if (sourceUrl) {
                        bundle.url = sourceUrl;
                    }
                    bundle.sourceResource = sourceResource;
                    bundle.sourceDependency = dependency;
                    bundle.inPlaceDeployment = true;
                }
            }
        }

        if (dependency.isExternalResource()) {
            bundle = this.addDependencyToBundle(dependency, dependency.getUrl(), undefined, slot);
        }
        
        if (!bundle && (this.bundlingEnabled === false || this.inPlaceDeploymentEnabled)) {
            var targetBundleName;
            if (sourceResource) {
                if (this.checksumsEnabled) {
                    targetBundleName = sourceResource.getName();
                }
                else {
                    targetBundleName = sourceResource.getAbsolutePath();
                }
            }
            else {
                targetBundleName = dependency.getKey();
            }

            bundle = this.addDependencyToBundle(dependency, targetBundleName, undefined, slot);
            
            bundle.dependencySlotInUrl = false;
            if (this.inPlaceDeploymentEnabled) {
                bundle.sourceResource = sourceResource;
                bundle.sourceDependency = dependency;
                if (!sourceResource) {
                    bundle.requireChecksum = true;
                }
            }
        }
        
        if (!bundle) {
            //Make sure the dependency is part of a bundle. If it not part of a preconfigured bundle then put it in a page-specific bundle
            bundle = this.addDependencyToBundle(dependency, pageBundleName, undefined, slot);
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