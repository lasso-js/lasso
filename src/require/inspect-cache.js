var ok = require('assert').ok;
var logger = require('raptor-logging').logger(module);
var streamToString = require('./util/streamToString');
var inspect = require('./util/inspect');
var nodePath = require('path');
var extend = require('raptor-util/extend');
var normalizeFSPath = require('./util/normalizeFSPath');

exports.inspectCached = function(path, requireHandler, lassoContext, config) {
    var debugEnabled = logger.isDebugEnabled();

    ok(path, '"path" is required');
    ok(requireHandler, '"requireHandler" is required');

    ok(lassoContext, '"lassoContext" is required');
    ok(config, '"config" is required');

    ok(typeof path === 'string', '"path" should be a string');
    ok(typeof requireHandler.createReadStream === 'function', '"requireHandler.createReadStream" should be a function');
    ok(typeof requireHandler.getLastModified === 'function', '"requireHandler.getLastModified" should be a function');
    ok(typeof lassoContext === 'object', '"lassoContext" should be an object');
    ok(typeof config === 'object', '"config" should be an object');

    function resolveInspectedRequires(inspectResult) {
        var allRequires = [];
        var fromDir = nodePath.dirname(path);

        function handleRequire(require) {
            var resolved = lassoContext.resolveCached(require.path, fromDir);
            var pathRelative = nodePath.relative(process.cwd(), path);
            var fromRelative = nodePath.relative(process.cwd(), fromDir);
            if (!resolved) {
                throw new Error('Module not found: ' + require.path + ' (from "' + fromRelative + '" and referenced in "' + pathRelative + '")');
            }

            // Clone the require
            require = extend({}, require);
            require.resolved = resolved;
            allRequires.push(require);
            return require;
        }

        if (inspectResult.requires) {
            inspectResult.requires = inspectResult.requires.map(handleRequire);
        }

        if (inspectResult.asyncBlocks) {
            inspectResult.asyncBlocks.forEach(function(asyncBlock) {
                asyncBlock.requires = asyncBlock.requires.map(handleRequire);
            });
        }

        inspectResult.allRequires = allRequires;
    }

    // Get or create the required caches
    var transformsId = config.transforms ? '/' + config.transforms.id : '';
    var inspectCache = lassoContext.data['lasso-require/inspect'];
    if (!inspectCache && lassoContext.cache) {
        inspectCache = lassoContext.data['lasso-require/inspect'] = lassoContext.cache.getCache(
            // Unique cache name based on the set of enabled require transforms:
            'lasso-require/inspect' + (transformsId ? '-' + transformsId : ''), // NOTE: ".1" is just needed for cache busting old versions
            // Name of the cache configuration to use:
            'lasso-require/inspect');
    }

    var src;
    var lastModified;

    function readSource() {
        if (src != null) {
            // We have already read in the source code for the require so just return that!
            return Promise.resolve(src);
        }

        // Otherwise, let's read in the stream into a string value and invoke the callback when it is done.
        var stream = requireHandler.createReadStream();
        return streamToString(stream)
            .then((_src) => {
                src = _src;
                return src;
            });
    }

    var fromCache = true;

    function cacheBuilder () {
        fromCache = false;
        return readSource()
            .then((src) => {
                return inspect(src, { filename: path });
            });
    }

    function afterInspect (inspectResult) {
        if (debugEnabled) {
            logger.debug('Inspection result for ' + path + ': ' + JSON.stringify(inspectResult));
        }

        // Do a shallow clonse so that we don't modify the object stored in the cache
        inspectResult = extend({}, inspectResult);
        inspectResult.lastModified = lastModified || -1;
        if (fromCache) {
            inspectResult.fromCache = fromCache;
        }

        resolveInspectedRequires(inspectResult);

        if (src) {
            // If src is non-null then that means that the builder needed to be invoked to read
            // the require dependency to inspect the source. Since we had to read the dependency let's
            // also provide the src so that we don't need to re-read it to generate the final
            // output bundle
            inspectResult.createReadStream = function() {
                return lassoContext.deferredStream(function() {
                    this.push(src);
                    this.push(null);
                });
            };
        } else {
            inspectResult.createReadStream = requireHandler.createReadStream.bind(requireHandler);
        }

        return inspectResult;
    }

    // Inspecting a JavaScript file is expensive since it requires parsing the JavaScript to find all of the
    // requires. We really don't want to do that every time so we *always* calculate a cache key for the
    // the dependency. In the normal case we use the "lastModiifed" time for the require, but in case where
    // that is not available then we read in the JavaScript code for the require and calculate a fingerprint
    // on the provided source and use that as a cache key.

    /**
     * This method does the final inspection after we have calculated the cache key.
     * At this point we may or may not have actually read in the source for the require.
     * @return {[type]} [description]
     */
    function doInspect(cacheKey) {
        ok(cacheKey);

        if (!inspectCache) {
            return cacheBuilder().then(afterInspect);
        }

        // try to read the inspect result from the cache
        return inspectCache.get(
            cacheKey,
            {
                lastModified: lastModified && lastModified > 0 ? lastModified : undefined,
                builder: cacheBuilder
            })
            .then(afterInspect);
    }

    function buildCacheKeyFromFingerprint() {
        return new Promise((resolve, reject) => {
            // We are going to need to read in the source code for the require to calculate the fingerprint.
            // We will use the fingerprint as a cache key to avoid having to inspect the JavaScript in the
            // case where there is cache hit. Since we have already read in the source this won't need to be
            // done later in the pipeline.
            src = '';
            var fingerprint = null;

            var stream = requireHandler.createReadStream();
            var fingerprintStream = lassoContext.createFingerprintStream();

            fingerprintStream
                .on('fingerprint', function(_fingerprint) {
                    fingerprint = _fingerprint;
                })
                .on('data', function(data) {
                    src += data;
                })
                .on('end', function() {
                    resolve(fingerprint);
                })
                .on('error', reject);

            stream
                .on('error', reject)
                .pipe(fingerprintStream);
        });
    }

    return requireHandler.getLastModified()
        .then((_lastModified) => {
            lastModified = _lastModified;

            if (!lastModified || lastModified < 0) {
                lastModified = undefined;
            }

            if (lastModified) {
                return normalizeFSPath(path);
            } else {
                return buildCacheKeyFromFingerprint();
            }
        })
        .then(doInspect);
};
