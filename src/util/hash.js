const crypto = require('crypto');

exports.HASH_OVERFLOW_LENGTH = 8;

exports.generate = function (str, len) {
    let hash = crypto.createHash('sha1')
        .update(str)
        .digest('hex');

    if (len != null) hash = hash.substring(0, len);
    return hash;
};
