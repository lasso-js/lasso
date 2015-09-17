var lassoImage = require('lasso-image');

module.exports = function(out, path, callback) {
    var asyncOut = out.beginAsync();

    lassoImage.getImageInfo(path, function(err, imageInfo) {
        if (err) {
            return asyncOut.error(err);
        }

        callback(asyncOut, imageInfo);
        asyncOut.end();
    });
};