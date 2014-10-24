var dependencyWalker = require('./dependency-walker');
var DependencyTree = require('./DependencyTree');
var logger = require('raptor-logging').logger(module);
var series = require('raptor-async/series');
var getModuleRootDir = require('raptor-modules/util').getModuleRootDir;
var nodePath = require('path');
var ok = require('assert').ok;

var recurseHandlers = {
    none: function(rootDependency, optimizerContext) {
        return {
            shouldIncludeDependency: function(dependency) {
                return false;
            },

            shouldRecurseIntoPackageDependency: function(dependency) {
                return false;
            }
        };
    },

    all: function(rootDependency, optimizerContext) {

        return {
            shouldIncludeDependency: function(dependency) {
                return true;
            },

            shouldRecurseIntoPackageDependency: function(dependency) {
                return true;
            }
        };
    },

    dir: function(rootDependency, optimizerContext) {

        var baseDir = rootDependency.getDir(optimizerContext) || '';

        return {
            shouldIncludeDependency: function(dependency) {
                var dir = dependency.getDir(optimizerContext);
                return dir === baseDir;
            },

            shouldRecurseIntoPackageDependency: function(dependency) {
                if (dependency.getDir(optimizerContext) === baseDir) {
                    return true;
                }

                return false;
            }
        };
    },

    dirtree: function(rootDependency, optimizerContext) {

        var baseDir = rootDependency.getDir(optimizerContext);

        function checkDir(dependency) {
            if (!baseDir) {
                return false;
            }

            var dir = dependency.getDir(optimizerContext);
            if (!dir) {
                return false;
            }

            return dir.startsWith(baseDir);
        }

        return {
            shouldIncludeDependency: function(dependency) {
                return checkDir(dependency);
            },

            shouldRecurseIntoPackageDependency: function(dependency) {
                return checkDir(dependency);
            }
        };
    },

    module: function(rootDependency, optimizerContext) {
        var baseDir = rootDependency.getDir(optimizerContext);
        var nodeModulesDir;

        if (baseDir) {
            baseDir = getModuleRootDir(baseDir);

            nodeModulesDir = nodePath.join(baseDir, 'node_modules');
        }

        function checkDir(dependency) {
            if (!baseDir) {
                return false;
            }

            var dir = dependency.getDir(optimizerContext);
            if (!dir) {
                return false;
            }

            return dir.startsWith(baseDir) && !dir.startsWith(nodeModulesDir);
        }

        return {
            shouldIncludeDependency: function(dependency) {
                return checkDir(dependency);
            },

            shouldRecurseIntoPackageDependency: function(dependency) {
                return checkDir(dependency);
            }
        };
    }
};

function buildBundle(bundleMappings, dependencyRegistry, bundleConfig, optimizerContext, callback) {
    ok(typeof callback === 'function', 'callback function is required');

    var tree = logger.isDebugEnabled() ? new DependencyTree() : null;
    var flags = optimizerContext.flags;

    var dependencies = bundleConfig.getDependencies(dependencyRegistry);
    var targetBundleName = bundleConfig.name;

    dependencies.normalize(function(err, dependencies) {
        var asyncTasks = dependencies.map(function(rootDependency) {
            return function(callback) {
                rootDependency.init(optimizerContext, function(err) {
                    if (err) {
                        return callback(err);
                    }

                    var recurseInto = rootDependency._recurseInto || bundleConfig.getRecurseInto();

                    if (!recurseInto) {
                        if (rootDependency.getDir()) {
                            recurseInto = 'dirtree';
                        } else {
                            recurseInto = 'all';
                        }

                    }

                    if (!recurseHandlers[recurseInto]) {
                        throw new Error('Invalid recursion option: ' + recurseInto);
                    }

                    var recurseHandler = recurseHandlers[recurseInto](rootDependency, optimizerContext);

                    function shouldIncludeDependency(dependency) {
                        if (dependency === rootDependency ||
                                (optimizerContext.parentDependency && optimizerContext.parentDependency === rootDependency)) {
                            // Always include the root dependency or any child dependencies if the top-level
                            // dependency was a package
                            return true;
                        }

                        return recurseHandler.shouldIncludeDependency(dependency);
                    }

                    function shouldRecurseIntoPackageDependency(dependency) {
                        if (dependency === rootDependency) {
                            // Always recurse into top-level package dependencies
                            return true;
                        }

                        return recurseHandler.shouldRecurseIntoPackageDependency(dependency);
                    }

                    dependencyWalker.walk({
                            optimizerContext: optimizerContext,
                            dependency: rootDependency,
                            flags: flags,
                            shouldSkipDependency: function(dependency) {
                                if (bundleMappings.getBundleForDependency(dependency)) {
                                    // The dependency has already been added to another bundle
                                    return true;
                                }

                                if (dependency.isPackageDependency()) {
                                    return !shouldRecurseIntoPackageDependency(dependency);
                                } else if (!dependency.read) {
                                    // ignore non-readable dependencies during bundling phase
                                    return true;
                                }

                                return false;
                            },
                            on: {
                                dependency: function(dependency, context) {
                                    if (dependency.isPackageDependency()) {
                                        if (tree) {
                                            tree.add(dependency, context.parentDependency);
                                        }

                                        // We are only interested in non-package dependencies
                                        return;
                                    }

                                    if (shouldIncludeDependency(dependency)) {
                                        bundleMappings.addDependencyToBundle(
                                            dependency,
                                            targetBundleName,
                                            context.slot,
                                            bundleConfig);

                                        if (tree) {
                                            tree.add(dependency, context.parentDependency);
                                        }

                                    }
                                }
                            }
                        }, callback);
                });
            };
        });

        series(asyncTasks, function(err) {
                if (err) {
                    return callback(err);
                }

                if (tree) {
                    logger.debug('Bundle "' + targetBundleName + '":\n' + tree.toString());
                }

                callback();
            });
    });
}

exports.buildBundle = buildBundle;
