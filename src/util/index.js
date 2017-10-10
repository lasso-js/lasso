var cachingStream = require('./caching-stream');
var fingerprintStream = require('./fingerprint-stream');
var DeferredReadable = require('./DeferredReadable');
var logger = require('raptor-logging').logger(module);
// var DEFAULT_READ_FILE_OPTIONS = {encoding: 'utf8'};

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

function readStream(func) {
    // Calling read will do one of the following
    // 1) Return the actual value or null if there no data
    // 2) Invoke our callback with a value
    // 3) Return a stream
    var stream = new DeferredReadable(function() {
        // this function will be called when it is time to start reading data
        var finished = false;

        var callback = (err, value) => {
            if (finished) {
                logger.warn(new Error('read callback invoked after finish'));
                return;
            }

            if (err) {
                stream.emit('error', err);
                return;
            }

            if (value == null) {
                stream.push(null);
                finished = true;
            } else {
                if (typeof value === 'string') {
                    stream.push(value);
                    stream.push(null);
                    finished = true;
                } else if (typeof value.pipe === 'function') {
                    // Looks like a stream...
                    value.pipe(this);
                    finished = true;
                } else if (typeof value.then === 'function') {
                    // Looks like a promise...
                    value
                        .then((value) => {
                            callback(null, value);
                        })
                        .catch(callback);
                } else {
                    // Hopefully a Buffer
                    stream.push(value);
                    stream.push(null);
                    finished = true;
                }
            }
        };

        var result = func(callback);

        if (!finished) {
            // callback was not invoked
            if (result === null) {
                callback(null, null);
            } else if (result === undefined) {
                // waiting on callback
            } else if (result && typeof result.pipe === 'function') {
                finished = true;
                return result;
            } else if (result && typeof result.then === 'function') {
                result.then((promiseResult) => {
                    if (promiseResult && typeof promiseResult.pipe === 'function') {
                        finished = true;
                        stream.emit('ready', promiseResult);
                    } else {
                        callback(null, promiseResult);
                    }
                }).catch((err) => {
                    callback(err);
                });
            } else {
                callback(null, result);
                // A stream was returned, so we will return it
            }
        }
    });

    return stream;
}

exports.merge = merge;
exports.streamToString = streamToString;
exports.createCachingStream = cachingStream.create;
exports.createFingerprintStream = fingerprintStream.create;
exports.readStream = readStream;
exports.DeferredReadable = require('./DeferredReadable');
