var lasso = require('../');
var async = require('async');

var util = require('./util');

module.exports = function render(input, out) {
    var renderBody = input.renderBody;

    if (!renderBody) {
        return;
    }

    var theLasso = input.lasso;
    var lassoRenderContext = util.getLassoRenderContext(out);

    if (!theLasso) {
        theLasso = lassoRenderContext.data.lasso || lasso.defaultLasso;
    }

    if (!theLasso) {
        throw new Error('Page lasso not configured for application. Use require("lasso").configureDefault(config) to configure the default page lasso or provide an lasso as input using the "lasso" attribute.');
    }


    var lassoContext = lassoRenderContext.data.lassoContext;

    if (!lassoContext) {
        lassoContext = lassoRenderContext.data.lassoContext = theLasso.createLassoContext({});
        lassoContext.renderContext = out;
    }

    var paths = input.paths;
    var asyncOut = null;
    var done = false;

    function doRenderBody(err, bundledResources) {
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
            renderBody.apply(this, [targetOut].concat(bundledResources));
        }

        if (asyncOut) {
            // If we did start asynchronous writer then we need to end it now
            asyncOut.end();
        }
    }


    async.map(
        paths,
        function(path, callback) {
            theLasso.lassoResource(path, lassoContext, callback);
        },
        doRenderBody);

    if (!done) {
        asyncOut = out.beginAsync({ name: 'lasso-resources:' + paths.join(',')});
    }
};
