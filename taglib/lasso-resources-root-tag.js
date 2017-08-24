const async = require('async');
const getLassoRenderContext = require('./getLassoRenderContext');

module.exports = function render (input, out) {
    var renderBody = input.renderBody;

    if (!renderBody) {
        return;
    }

    var lassoRenderContext = getLassoRenderContext(out);
    var theLasso = input.lasso || lassoRenderContext.lasso;

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

    function doRenderBody (err, bundledResources) {
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

    // TODO: Change to fully use async/await
    async.map(
        paths,
        async function (path, callback) {
            try {
                const lassoResourceResult = await theLasso.lassoResource(path, lassoContext);
                callback(null, lassoResourceResult);
            } catch (err) {
                callback(err);
            }
        },
        doRenderBody);

    if (!done) {
        asyncOut = out.beginAsync({
            name: 'lasso-resources:' + paths.join(',')
        });
    }
};
