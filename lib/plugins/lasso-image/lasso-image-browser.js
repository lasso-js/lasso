exports.getImageInfo = function(path, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = null;
    }

    callback(null, require(path));
};
