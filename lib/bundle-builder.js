var dependencyWalker = require('./dependency-walker');
var DependencyTree = require('./DependencyTree');
var logger = require('raptor-logging').logger(module);
var promises = require('raptor-promises');

var recurseHandlers = {
    none: function(rootDependency) {
        return {
            shouldIncludeDependency: function(dependency, context) {
                return false;
            },

            shouldRecurseIntoPackageDependency: function(dependency, context) {
                return false;
            }
        };
    },

    all: function(rootDependency) {

        return {
            shouldIncludeDependency: function(dependency, context) {
                return true;
            },

            shouldRecurseIntoPackageDependency: function(dependency, context) {
                return true;
            }
        };
    },

    dir: function(rootDependency) {

        var baseDir = rootDependency.getDir() || '';

        return {
            shouldIncludeDependency: function(dependency, context) {
                var dir = dependency.getDir();
                return dir === baseDir;
            },

            shouldRecurseIntoPackageDependency: function(dependency, context) {
                if (dependency.getDir() === baseDir) {
                    return true;
                }

                return false;
            }
        };
    },

    dirtree: function(rootDependency) {

        var baseDir = rootDependency.getDir();

        function checkDir(dependency) {
            if (!baseDir) {
                return false;
            }

            var dir = dependency.getDir();
            if (!dir) {
                return false;
            }

            return dir.startsWith(baseDir);
        }

        return {
            shouldIncludeDependency: function(dependency, context) {
                return checkDir(dependency);
            },

            shouldRecurseIntoPackageDependency: function(dependency, context) {
                return checkDir(dependency);
            }
        };
    }
};

function buildBundle(bundleMappings, bundleConfig) {
    var promiseChain = promises.resolved();
    var tree = new DependencyTree();
    var context = bundleMappings.context;
    var enabledExtensions = bundleMappings.enabledExtensions;

    var dependencies = bundleConfig.dependencies;
    var targetBundleName = bundleConfig.name;

    dependencies.forEach(function(rootDependency) {
        promiseChain = promiseChain.then(function() {

            var recurseInto = rootDependency._recurseInto;

            if (!recurseInto) {
                recurseInto = 'dirtree';
            }

            if (!recurseHandlers[recurseInto]) {
                throw new Error('Invalid recursion option: ' + recurseInto);
            }

            var recurseHandler = recurseHandlers[recurseInto](rootDependency);

            function shouldIncludeDependency(dependency) {
                if (dependency === rootDependency ||
                        (context.parentDependency && context.parentDependency === rootDependency)) {
                    // Always include the root dependency or any child dependencies if the top-level
                    // dependency was a package
                    return true;
                }

                return recurseHandler.shouldIncludeDependency(dependency, context);
            }

            function shouldRecurseIntoPackageDependency(dependency) {
                if (dependency === rootDependency) {
                    // Always recurse into top-level package dependencies
                    return true;
                }

                return recurseHandler.shouldRecurseIntoPackageDependency(dependency, context);
            }

            return dependencyWalker.walk({
                context: context,
                dependency: rootDependency,
                enabledExtensions: enabledExtensions,
                on: {
                    dependency: function(dependency, context) {
                        if (dependency.isPackageDependency()) {
                            tree.add(dependency, context.parentDependency);

                            if (!shouldRecurseIntoPackageDependency(dependency)) {
                                context.skipPackage();
                            }

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

                        if (bundleMappings.getBundleForDependency(dependency)) {
                            // The dependency has already been added to another bundle
                            return;
                        }

                        if (shouldIncludeDependency(dependency)) {
                            bundleMappings.addDependencyToBundle(dependency, targetBundleName, context.slot, bundleConfig);
                            tree.add(dependency, context.parentDependency);
                        }
                    },

                    package: function(pkg, dependency, context) {

                    }
                }
            });
        });
    });

    return promiseChain
        .then(function() {
            logger.info('Bundle "' + targetBundleName + '":\n' + tree.toString());
        });
}

exports.buildBundle = buildBundle;