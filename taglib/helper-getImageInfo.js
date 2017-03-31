var getLassoRenderContext = require('./getLassoRenderContext');
var lassoImage = require('lasso-image');

module.exports = function(out, path, callback) {
    var targetOut = out;
    var done = false;

    var lassoRenderContext = getLassoRenderContext(out);
    var theLasso = lassoRenderContext.lasso;

    lassoImage.getImageInfo(path, { lasso: theLasso }, function(err, imageInfo) {
        done = true;

        if (err) return targetOut.error(err);

        callback(targetOut, imageInfo);

        if (targetOut !== out) {
            targetOut.end();
        }
    });

    if (!done) {
        targetOut = out.beginAsync();
    }
};