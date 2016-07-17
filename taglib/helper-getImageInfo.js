var getLassoRenderContext = require('./getLassoRenderContext');
var lassoImage = require('lasso-image');

module.exports = function(out, path, retinaPath, callback) {
    var asyncOut = out.beginAsync();

    getImageInfo(path, function (imageInfo) {
        if (path === retinaPath) {
            finalize(imageInfo);
        } else {
            getImageInfo(retinaPath, function (retinaImageInfo) {
                finalize(imageInfo, retinaImageInfo);
            });
        }
    });

    function getImageInfo(path, cb) {
        var lassoRenderContext = getLassoRenderContext(out);
        var theLasso = lassoRenderContext.lasso;

        lassoImage.getImageInfo(path, { lasso: theLasso }, function(err, imageInfo) {
            if (err) {
                return asyncOut.error(err);
            }

            cb(imageInfo);
        });
    }

    function finalize(imageInfo, retinaImageInfo) {
        if (retinaImageInfo) {
            imageInfo.srcset = retinaImageInfo.url + ' 2x';
        }

        callback(asyncOut, imageInfo);
        asyncOut.end();
    }
};
