var builtinsModule = require('./builtins');
var parseRequire = require('./parseRequire');
var nodePath = require('path');
var getRequireRemapFromDir = require('./getRequireRemapFromDir');
var lassoResolveFrom = require('lasso-resolve-from');
var ok = require('assert').ok;
var cachingFs = require('../caching-fs');

var _normalizePath = nodePath.sep === '/'
    ? function _normalizePathUnix(path) {
        // nothing to do for non-Windows platform
        return path;
    }
    : function _normalizePathWindows(path) {
        // replace back-slash with forward-slash
        return path.replace(/[\\]/g, '/');
    };

exports.createResolver = function(lassoContext, getClientPath) {
    var resolverConfig = lassoContext.config && lassoContext.config.resolver;
    var requireConfig = lassoContext.config && lassoContext.config._requirePluginConfig;
    var builtinsConfig = (resolverConfig && resolverConfig.builtins) || (requireConfig && requireConfig.builtins);

    var postResolveFn = resolverConfig && resolverConfig.postResolve;
    var builtins = builtinsModule.getBuiltins(builtinsConfig);

    function resolve(targetModule, fromDir, options) {
        ok(targetModule, '"targetModule" is required');
        ok(typeof targetModule === 'string', '"targetModule" should be a string');
        ok(typeof fromDir === 'string', '"fromDir" should be a string');

        var parsedRequire = parseRequire(targetModule);

        // Normalize the path by making sure the path separator is always forward slash
        // (normalize does nothing on non-Windows platform)
        targetModule = _normalizePath(parsedRequire.path);

        var dependencyType = parsedRequire.type;

        var resolveOptions = {
            includeMeta: true
        };

        resolveOptions.extensions = lassoContext.dependencyRegistry.getRequireExtensionNames();

        resolveOptions.remaps = function(dir) {
            return lassoContext && getRequireRemapFromDir(dir, lassoContext);
        };

        var resolvedInfo = lassoResolveFrom(fromDir, targetModule, resolveOptions);

        var isBuiltin = resolvedInfo && builtins && builtins[targetModule] === resolvedInfo.path;

        var clientPath;

        if (resolvedInfo && !isBuiltin) {
            clientPath = getClientPath(resolvedInfo.path);
        } else {
            if (targetModule.charAt(0) === '.') {
                return null;
            }

            var resolvedBuiltin = builtins[targetModule];

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

                clientPath = getClientPath(resolvedBuiltin);
            } else if (options && options.moduleFallbackToRelative) {
                var resolvedPath = nodePath.resolve(fromDir, targetModule);

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

            var result = {
                path: resolvedInfo.path,
                meta: resolvedInfo.meta,
                clientPath: clientPath
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

        var key = targetModule + '@' + fromDir;
        var cache = lassoContext.cache.getSyncCache('resolve');

        var result = cache.getSync(key);

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
