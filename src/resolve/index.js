const builtinsModule = require('./builtins');
const parseRequire = require('./parseRequire');
const nodePath = require('path');
const getRequireRemapFromDir = require('./getRequireRemapFromDir');
const lassoResolveFrom = require('lasso-resolve-from');
const ok = require('assert').ok;
const cachingFs = require('../caching-fs');

const _normalizePath = nodePath.sep === '/'
    ? function _normalizePathUnix(path) {
        // nothing to do for non-Windows platform
        return path;
    }
    : function _normalizePathWindows(path) {
        // replace back-slash with forward-slash
        return path.replace(/[\\]/g, '/');
    };

exports.createResolver = function(lassoContext, getClientPath) {
    const resolverConfig = lassoContext.config && lassoContext.config.resolver;
    const requireConfig = lassoContext.config && lassoContext.config._requirePluginConfig;
    const builtinsConfig = (resolverConfig && resolverConfig.builtins) || (requireConfig && requireConfig.builtins);

    const postResolveFn = resolverConfig && resolverConfig.postResolve;
    const builtins = builtinsModule.getBuiltins(builtinsConfig);

    function resolve(targetModule, fromDir, options) {
        ok(targetModule, '"targetModule" is required');
        ok(typeof targetModule === 'string', '"targetModule" should be a string');
        ok(typeof fromDir === 'string', '"fromDir" should be a string');

        const parsedRequire = parseRequire(targetModule);

        // Normalize the path by making sure the path separator is always forward slash
        // (normalize does nothing on non-Windows platform)
        targetModule = _normalizePath(parsedRequire.path);

        const dependencyType = parsedRequire.type;

        const resolveOptions = {
            includeMeta: true
        };

        resolveOptions.extensions = lassoContext.dependencyRegistry.getRequireExtensionNames();

        resolveOptions.remaps = function(dir) {
            return lassoContext && getRequireRemapFromDir(dir, lassoContext);
        };

        let resolvedInfo = lassoResolveFrom(fromDir, targetModule, resolveOptions);

        const isBuiltin = resolvedInfo && builtins && builtins[targetModule] === resolvedInfo.path;

        if (!(resolvedInfo && !isBuiltin)) {
            if (targetModule.charAt(0) === '.') {
                return null;
            }

            const resolvedBuiltin = builtins[targetModule];

            if (resolvedBuiltin) {
                resolvedInfo = {
                    path: resolvedBuiltin,
                    meta: [
                        {
                            type: 'builtin',
                            name: targetModule,
                            target: resolvedBuiltin
                        }
                    ]
                };
            } else if (options && options.moduleFallbackToRelative) {
                const resolvedPath = nodePath.resolve(fromDir, targetModule);

                // Since the path looked like it was for a module we should check
                // to see if the fallback technique actually found a file. If file
                // does not exist for fallback path, then we'll report an error
                // that the module does not exist by re-throwing the original error.
                if (cachingFs.existsSync(resolvedPath)) {
                    // Fallback technique found the path.
                    // We might want to log something here to suggest that relative
                    // paths be prefixed with "." to avoid the extra work of trying to
                    // resolve path using NodeJS module search path.
                    resolvedInfo = {
                        path: resolvedPath
                    };
                }
            }
        }

        if (resolvedInfo) {
            if (postResolveFn) {
                postResolveFn(resolvedInfo, lassoContext);
            }

            const result = {
                path: resolvedInfo.path,
                meta: resolvedInfo.meta,
                clientPath: getClientPath(resolvedInfo.path)
            };

            if (resolvedInfo.voidRemap) {
                result.voidRemap = true;
            }

            if (dependencyType) {
                result.type = dependencyType;
            }

            return result;
        } else {
            // Path is not a module or resolved path
            throw new Error('Failed to resolve "' + targetModule + '". Target file does not exist. Started search from directory "' + fromDir + '".');
        }
    }

    function resolveCached(targetModule, fromDir, options) {
        if (!lassoContext.cache) {
            return resolve(targetModule, fromDir, options);
        }

        const key = targetModule + '@' + fromDir;
        const cache = lassoContext.cache.getSyncCache('resolve');

        let result = cache.getSync(key);

        if (result === undefined) {
            result = resolve(targetModule, fromDir, options);
            cache.putSync(key, result || null);
        }

        return result || undefined;
    }

    return {
        resolve,
        resolveCached
    };
};
