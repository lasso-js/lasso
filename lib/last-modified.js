var cachingFs = require('./caching-fs');

exports.forFile = function(filePath, callback) {
    cachingFs.lastModified(filePath, callback);
};
