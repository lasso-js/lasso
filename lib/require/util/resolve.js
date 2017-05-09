var parseRequire = require('./parseRequire');
var nodePath = require('path');
var getRequireRemapFromDir = require('./getRequireRemapFromDir');
var lassoResolveFrom = require('lasso-resolve-from');
var ok = require('assert').ok;

var _normalizePath = nodePath.sep === '/' ?
    function _normalizePathUnix(path) {
        // nothing to do for non-Windows platform
        return path;
    } :
    function _normalizePathWindows(path) {
        // replace back-slash with forward-slash
        return path.replace(/[\\]/g, '/');
    };

exports.createResolver = function(builtins, getClientPath) {
    function resolveRequire(targetModule, fromDir, lassoContext) {
        ok(targetModule, '"targetModule" is required');
        ok(typeof targetModule === 'string', '"targetModule" should be a string');
        ok(typeof fromDir === 'string', '"fromDir" should be a string');

        console.log('lasso-require:resolveRequire', targetModule, fromDir);

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
            }
        }

        if (resolvedInfo) {

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
            return undefined;
        }
    }

    function resolveRequireCached(targetModule, fromDir, lassoContext) {
        var key = targetModule + '@' + fromDir;
        var cache = lassoContext.cache.getSyncCache('resolveRequire');

        var result = cache.getSync(key);

        if (result === undefined) {
            result = resolveRequire(targetModule, fromDir, lassoContext);
            cache.putSync(key, result || null);
        }

        return result || undefined;
    }

    return {
        resolveRequire,
        resolveRequireCached
    };
};
