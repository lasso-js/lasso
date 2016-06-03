var lassoLoader = require('lasso-loader');
var path = require('path');
var loaderMeta = module.__loaderMetadata;

lassoLoader.async = function(asyncId, callback) {
    var resources = loaderMeta ? loaderMeta[asyncId] : null;
    if (!resources) {
        throw new Error('Loader metadata missing for "' + asyncId + '"');
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