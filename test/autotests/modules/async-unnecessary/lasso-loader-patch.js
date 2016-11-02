var lassoLoader = require('lasso-loader');
var path = require('path');
var loaderMeta = module.__loaderMetadata;

function _handleMissingAsync(asyncId) {
    if (asyncId.charAt(0) === '_') {
        return;
    } else {
        throw new Error('No loader metadata for ' + asyncId);
    }
}

lassoLoader.async = function(asyncId, callback) {
    if (!loaderMeta) {
        return callback();
    }

    var resources;

    if (Array.isArray(asyncId)) {
        resources = {
            js: [],
            css: []
        };
        asyncId.forEach(function(asyncId) {
            var curResources = loaderMeta[asyncId];
            if (curResources) {
                ['js', 'css'].forEach(function(key) {
                    var paths = curResources[key];
                    if (paths) {
                        resources[key] = resources[key].concat(paths);
                    }
                });
            } else {
                _handleMissingAsync(asyncId);
            }
        });
    } else if (!(resources = loaderMeta[asyncId])) {
        _handleMissingAsync(asyncId);
        return callback();
    }

    var job;
    var modulesRuntime = require.runtime;
    if (modulesRuntime) {
        // Create a pending job in the module runtime system which will
        // prevent any "require-run" modules from running if they are
        // configured to wait until ready.
        // When all pending jobs are completed, the "require-run" modules
        // that have been queued up will be ran.
        job = modulesRuntime.pending();
    }

    var jsUrls = resources.js;
    if (jsUrls) {
        jsUrls.forEach((url) => {
            var filename = path.join($outputDir, url);
            $loadScript(filename);
        });
    }

    return callback();
};