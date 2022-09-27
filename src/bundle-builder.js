const dependencyWalker = require('./dependency-walker');
const DependencyTree = require('./DependencyTree');
const logger = require('raptor-logging').logger(module);
const lassoPackageRoot = require('lasso-package-root');
const nodePath = require('path');

const recurseHandlers = {
    none: function(rootDependency, lassoContext) {
        return {
            shouldIncludeDependency: function(dependency) {
                return false;
            },

            shouldRecurseIntoPackageDependency: function(dependency) {
                return false;
            }
        };
    },

    all: function(rootDependency, lassoContext) {
        return {
            shouldIncludeDependency: function(dependency) {
                return true;
            },

            shouldRecurseIntoPackageDependency: function(dependency) {
                return true;
            }
        };
    },

    dir: function(rootDependency, lassoContext) {
        const baseDir = rootDependency.getDir(lassoContext) || '';

        return {
            shouldIncludeDependency: function(dependency) {
                const dir = dependency.getDir(lassoContext);
                return dir === baseDir;
            },

            shouldRecurseIntoPackageDependency: function(dependency) {
                if (dependency.getDir(lassoContext) === baseDir) {
                    return true;
                }

                return false;
            }
        };
    },

    dirtree: function(rootDependency, lassoContext) {
        const baseDir = rootDependency.getDir(lassoContext);

        function checkDir(dependency) {
            if (!baseDir) {
                return false;
            }

            const dir = dependency.getDir(lassoContext);
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

    module: function(rootDependency, lassoContext) {
        let baseDir = rootDependency.getDir(lassoContext);
        let nodeModulesDir;

        if (baseDir) {
            baseDir = lassoPackageRoot.getRootDir(baseDir);

            nodeModulesDir = nodePath.join(baseDir, 'node_modules');
        }

        function checkDir(dependency) {
            if (!baseDir) {
                return false;
            }

            const dir = dependency.getDir(lassoContext);
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

function shouldIncludeDependency (lassoContext, rootDependency, recurseHandler, dependency) {
    if (dependency === rootDependency ||
            (lassoContext.parentDependency && lassoContext.parentDependency === rootDependency)) {
        // Always include the root dependency or any child dependencies if the top-level
        // dependency was a package
        return true;
    }

    return recurseHandler.shouldIncludeDependency(dependency);
}

function shouldRecurseIntoPackageDependency (rootDependency, recurseHandler, dependency) {
    if (dependency === rootDependency) {
        // Always recurse into top-level package dependencies
        return true;
    }

    return recurseHandler.shouldRecurseIntoPackageDependency(dependency);
}

async function buildBundle(bundleMappings, dependencyRegistry, bundleConfig, lassoContext) {
    const tree = logger.isDebugEnabled() ? new DependencyTree() : null;
    const flags = lassoContext.flags;

    const bundleDependencies = bundleConfig.getDependencies(dependencyRegistry);
    const targetBundleName = bundleConfig.name;

    // Each bundle should have its own phase data. Phase data is just a bucket of data that can
    // be used by dependency handlers to keep track of what has been done for the current "phase"
    // of optimization.
    lassoContext.setPhase('app-bundle-mappings');

    const dependencies = await bundleDependencies.normalize();

    for (const rootDependency of dependencies) {
        await rootDependency.init(lassoContext);

        logger.debug('Root init');

        let recurseInto = rootDependency._recurseInto || bundleConfig.getRecurseInto();

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

        const recurseHandler = recurseHandlers[recurseInto](rootDependency, lassoContext);

        await dependencyWalker.walk({
            lassoContext,
            dependency: rootDependency,
            flags,
            shouldSkipDependency (dependency) {
                if (dependency.isPageBundleOnlyDependency()) {
                    return true;
                }

                if (bundleMappings.getBundleForDependency(dependency)) {
                    // The dependency has already been added to another bundle
                    return true;
                }

                if (dependency.isPackageDependency()) {
                    return !shouldRecurseIntoPackageDependency(rootDependency, recurseHandler, dependency);
                } else if (!dependency.read) {
                    // ignore non-readable dependencies during bundling phase
                    return true;
                }

                return false;
            },
            on: {
                dependency (dependency, context) {
                    logger.debug(module.id, 'on dependency: ' + dependency.type);

                    if (dependency.isPackageDependency()) {
                        if (tree) {
                            tree.add(dependency, context.parentDependency);
                        }

                        // We are only interested in non-package dependencies
                        return;
                    }

                    if (shouldIncludeDependency(lassoContext, rootDependency, recurseHandler, dependency)) {
                        bundleMappings.addDependencyToBundle(
                            dependency,
                            targetBundleName,
                            context.slot,
                            bundleConfig,
                            lassoContext);

                        if (tree) {
                            tree.add(dependency, context.parentDependency);
                        }
                    }
                }
            }
        });
    }

    if (tree) {
        logger.debug('Bundle "' + targetBundleName + '":\n' + tree.toString());
    }
}

exports.buildBundle = buildBundle;
