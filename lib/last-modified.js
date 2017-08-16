var cachingFs = require('./caching-fs');

// TODO: Change in lasso-caching-fs
exports.forFile = async function (filePath) {
    return new Promise((resolve, reject) => {
        cachingFs.lastModified(filePath, function (err, data) {
            return err ? reject(err) : resolve(data);
        });
    });
};
