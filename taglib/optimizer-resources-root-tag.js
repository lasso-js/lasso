var optimizer = require('../');
var async = require('async');

var util = require('./util');

module.exports = function render(input, out) {
    var invokeBody = input.invokeBody;

    if (!invokeBody) {
        return;
    }

    var pageOptimizer = input.optimizer;
    var optimizerRenderContext = util.getOptimizerRenderContext(out);

    if (!pageOptimizer) {
        pageOptimizer = optimizerRenderContext.data.pageOptimizer || optimizer.defaultPageOptimizer;
    }

    if (!pageOptimizer) {
        throw new Error('Page optimizer not configured for application. Use require("optimizer").configureDefault(config) to configure the default page optimizer or provide an optimizer as input using the "optimizer" attribute.');
    }


    var optimizerContext = optimizerRenderContext.data.optimizerContext;

    if (!optimizerContext) {
        optimizerContext = optimizerRenderContext.data.optimizerContext = pageOptimizer.createOptimizerContext({});
        optimizerContext.renderContext = out;
    }

    var paths = input.paths;
    var asyncOut = null;
    var done = false;

    function renderBody(err, optimizedResources) {
        done = true;
        // When invoking the body we are going to either render to the async out (if
        // one or more bundles needed to be asynchronously loaded) or the original
        // out if all bundles were able to be loaded synchronously
        var targetOut = asyncOut || out;

        if (err) {
            // If bundle loading failed then emit the error on the async writer
            return targetOut.error(err);
        } else {
            // Otherwise, all of the bundles have been loaded and we are ready to invoke
            // the body function. The first argument will always be the "out" that
            // all of the code will render to and the remaining arguments will be the loaded
            // bundles in the order that maps to the associated variables that were found at
            // compile time
            input.invokeBody.apply(this, [targetOut].concat(optimizedResources));
        }

        if (asyncOut) {
            // If we did start asynchronous writer then we need to end it now
            asyncOut.end();
        }
    }


    async.map(
        paths,
        function(path, callback) {
            pageOptimizer.optimizeResource(path, optimizerContext, callback);
        },
        renderBody);

    if (!done) {
        asyncOut = out.beginAsync({ name: 'optimizer-resources:' + paths.join(',')});
    }
};
