var cachingStream = require('./caching-stream');
var fingerprintStream = require('./fingerprint-stream');

function merge(src, dest) {
    if (src != null &&
        dest != null &&
        !Array.isArray(src) &&
        !Array.isArray(dest) &&
        typeof src === 'object' &&
        typeof dest === 'object') {

        Object.getOwnPropertyNames(src)
            .forEach(function(prop) {
                var descriptor = Object.getOwnPropertyDescriptor(src, prop);
                descriptor.value = merge(descriptor.value, dest[prop]);
                Object.defineProperty(dest, prop, descriptor);
            });

        return dest;
    }

    return src;
}

function streamToString(stream, callback) {
    var str = '';
    stream.on('data', function(data) {
        str += data;
    });

    stream.on('error', function(err) {
        callback(err);
    });

    stream.on('end', function() {
        callback(null, str);
    });
}

exports.merge = merge;
exports.streamToString = streamToString;
exports.createCachingStream = cachingStream.create;
exports.createFingerprintStream = fingerprintStream.create;
