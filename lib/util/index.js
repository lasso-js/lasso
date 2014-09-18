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

        function callback(err, code) {
            if (finished) {
                logger.warn(new Error('read callback invoked after finish'));
                return;
            }

            // don't let onFinished be called again
            finished = true;

            if (err) {
                stream.emit('error', err);
                return;
            }

            // If code is not null and not undefined then push it to output stream
            if (code != null) {
                // put the into the stream
                stream.push(code);
            }

            // push null which is used to signal completion
            stream.push(null);
        }

        var result = func(callback);

        if (!finished) {
            // callback was not invoked
            if (result === null) {
                // read function returned null which means that it has no data
                finished = true;
                stream.push(null);
            } else if (result === undefined) {
                // waiting on callback
            } else if (result.pipe) {
                // A stream was returned, so we will return it
                return result;
            } else {
                // result is not a stream but we have some type of data so push it to the stream
                finished = true;
                stream.push(result);
                stream.push(null);
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
