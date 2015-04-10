var lasso = require('../');
var nodePath = require('path');
var attrs = require('raptor-util/attrs');
var util = require('./util');

module.exports = function render(input, context) {
    var theLasso = input.lasso;
    var lassoRenderContext = util.getLassoRenderContext(context);

    if (!theLasso) {
        theLasso = lassoRenderContext.data.lasso || lasso.defaultLasso;
    }

    if (!theLasso) {
        throw new Error('Page lasso not configured for application. Use require("lasso").configureDefault(config) to configure the default page lasso or provide an lasso as input using the "lasso" attribute.');
    }

    var src = input.src;
    var imgPath = nodePath.resolve(input.dirname, src);

    var lassoContext = lassoRenderContext.data.lassoContext;

    if (!lassoContext) {
        lassoContext = lassoRenderContext.data.lassoContext = theLasso.createLassoContext({});
        lassoContext.renderContext = context;
    }

    var asyncContext;
    var done = false;

    function renderImgTag(url, context) {
        context.write('<img src="' + url + '"');
        if (input['*']) {
            context.write(attrs(input['*']));
        }
        context.write('>');
    }

    theLasso.lassoResource(imgPath, {lassoContext: lassoContext}, function(err, lassoedResource) {
        done = true;
        if (err) {
            if (asyncContext) {
                asyncContext.error(err);
            } else {
                throw err;
            }
        }

        if (asyncContext) {
            renderImgTag(lassoedResource.url, asyncContext);
            asyncContext.end();
        } else {
            renderImgTag(lassoedResource.url, context);
        }
    });

    if (!done) {
        asyncContext = context.beginAsync({name: 'lasso-img:' + imgPath});
    }
};