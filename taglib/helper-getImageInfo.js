var getLassoRenderContext = require('./getLassoRenderContext');
var lassoImage = require('lasso-image');

module.exports = function(out, path, callback) {
    var asyncOut = out.beginAsync();

    var lassoRenderContext = getLassoRenderContext(out);
    var theLasso = lassoRenderContext.lasso;

    lassoImage.getImageInfo(path, { lasso: theLasso }, function(err, imageInfo) {
        if (err) {
            return asyncOut.error(err);
        }

        callback(asyncOut, imageInfo);
        asyncOut.end();
    });
};