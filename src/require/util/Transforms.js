var logger = require('raptor-logging').logger(module);
var crypto = require('crypto');
var ok = require('assert').ok;
var PassThrough = require('stream').PassThrough;
var inspect = require('util').inspect;
var util = require('util');
var stream = require('stream');
const resolveFrom = require('resolve-from');

class TransformAdaptorStream extends stream.Transform {
    constructor(transform, lassoContext) {
        super();
        this.data = '';
        this.transformFunc = transform.func;
        this.lassoContext = lassoContext;
        this.transformName = transform.name;
    }

    _transform(buf, enc, callback) {
        // Collect all of the data as it is streamed in and just concatenate to a our data string
        // but don't actually stream out any data yet
        this.data += buf;
        callback();
    }

    _flush(callback) {
        // On the last flush we apply the transform by calling the transform function on the
        // data string that was collected from all input chunks
        var transformFunc = this.transformFunc;
        var result = transformFunc(this.data, this.lassoContext);
        if (result == null) {
            result = '';
        }

        if (typeof result === 'string') { // Did the transform synchronously return some data?
            this.push(result);
            callback();
        } else if (typeof result.then === 'function') { // Did the transform return a promise
            // The transform appears to have returned a Promise
            result
                .then((code) => {
                    this.push(code);
                    callback();
                })
                .catch((err) => {
                    try {
                        this.emit('error', err);
                    } finally {
                        callback();
                    }
                });
        } else {
            // Invalid transform...
            try {
                this.emit('error', new Error(`The ${this.transformName} did not return a valid value`));
            } finally {
                callback();
            }
        }
    }
}

function resolvePath(path, projectRoot) {
    var resolvedPath;

    if (projectRoot) {
        resolvedPath = resolveFrom(projectRoot, path);
        if (resolvedPath) {
            return resolvedPath;
        }
    } else {
        resolvedPath = resolveFrom(process.cwd(), path);
        if (resolvedPath) {
            return resolvedPath;
        }
    }

    return require.resolve(path);
}

class Transforms {
    constructor(transforms, projectRoot) {
        this._transforms = new Array(transforms.length);

        let shasum = crypto.createHash('sha1');

        transforms.forEach((curTransform, i) => {
            if (!curTransform) {
                throw new Error('Invalid require transform at index ' + i);
            }

            let transformFunc;
            let transformId;
            let stream = true;
            let transformName;

            if (typeof curTransform === 'string') {
                curTransform = {
                    transform: curTransform
                };
            } else if (typeof curTransform === 'function') {
                curTransform = {
                    transform: curTransform
                };
            }

            if (typeof curTransform === 'object') {
                let transform = curTransform.transform;

                if (transform) {
                    if (typeof transform === 'string') {
                        let transformPath = resolvePath(transform, projectRoot);
                        transform = require(transformPath);
                        transformId = transform.id || transformPath;
                    }
                } else {
                    transform = curTransform;
                }

                let transformConfig = curTransform.config;

                if (typeof transform === 'function') {
                    stream = true;

                    // Looks like a browserify style-transform
                    transformFunc = function(path, lassoContext) {
                        return transform(path, transformConfig);
                    };

                    transformId = transformFunc.toString();
                } else if (transform.createTransform) {
                    stream = transform.stream !== false;
                    transformName = transform.name;

                    transformFunc = transform.createTransform(transformConfig || {});
                    transformId = transform.id || transform.createTransform.toString();
                } else {
                    throw new Error('Invalid require transform at index ' + i + ': ' + util.inspect(curTransform));
                }
            } else {
                throw new Error('Invalid require transform at index ' + i + ': ' + util.inspect(curTransform));
            }

            if (!transformId) {
                transformId = transformFunc.toString();
            }

            ok(typeof transformFunc === 'function', 'Invalid transform at index ' + i);

            this._transforms[i] = {
                func: transformFunc,
                id: transformId,
                name: transformName || transformFunc.name,
                stream: stream
            };

            shasum.update(transformId);
        });

        this.id = shasum.digest('hex');
    }

    apply(path, inStream, lassoContext) {
        ok(inStream, 'inStream is required');
        var transforms = this._transforms;

        lassoContext = Object.create(lassoContext);
        lassoContext.filename = path;

        var len = transforms.length;
        if (!len) {
            // If there are no transforms then just return the input stream
            return inStream;
        }

        function applyTransform(input, transform) {
            if (transform.stream === false) {
                // The TransformAdaptorStream class extends stream.Transform and it is used
                // to convert a synchronous or Promise transform to a stream-based transform
                return input.pipe(new TransformAdaptorStream(transform, lassoContext));
            } else {
                return input.pipe(transform.func(path, lassoContext));
            }
        }

        return lassoContext.deferredStream(function() {
            var deferredStream = this;

            var finished = false;

            function handleError(e) {
                if (finished) {
                    return;
                }

                finished = true;
                deferredStream.emit('error', e);
                deferredStream.push(null); // End the stream just in case
            }

            inStream.on('error', handleError);

            var passThrough = new PassThrough({
                encoding: 'utf8'
            });

            var out = passThrough;

            for (var i = 0, len = transforms.length; i < len; i++) {
                let curTransform = transforms[i];

                var transformName = curTransform.name;

                if (logger.isDebugEnabled()) {
                    logger.debug('Applying transform ' + transformName);
                }

                // applyTransform will return a new stream that we can read from
                out = applyTransform(out, curTransform);

                if (typeof out.pipe !== 'function') {
                    return handleError(new Error('Non-stream object returned from transform (transform=' + transformName + ', output=' + inspect(out) + ')'));
                }

                out.on('error', handleError);
            }

            // Now start the flow of data at the source by piping the input stream
            // to the beginning of our transform chain (i.e. the initial pass thorugh stream)
            inStream.pipe(passThrough);

            return out;
        });
    }
}

module.exports = Transforms;
