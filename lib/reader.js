var transforms = require('./transforms');
var through = require('through');
var logger = require('raptor-logging').logger(module);
var ok = require('assert').ok;
var fs = require('fs');
var CombinedStream = require('./util/CombinedStream');
var DeferredReadable = require('./util/DeferredReadable');
var nodePath = require('path');
var AsyncValue = require('raptor-async/AsyncValue');

function createReadDependencyStream(dependency, lassoContext, transformerAsyncValue) {
    var deferredReadable = new DeferredReadable();

    transformerAsyncValue.done(function(err, transformer) {
        if (err) {
            deferredReadable.emit('error', err);
            return;
        }

        var contentType = dependency.getContentType();

        var readContext = Object.create(lassoContext || {});
        readContext.contentType = contentType;
        readContext.dependency = dependency;
        readContext.transformer = transformer;
        readContext.dir = dependency.getDir ? dependency.getDir(lassoContext) : null;

        if (dependency.getSourceFile) {
            readContext.path = dependency.getSourceFile();
        }

        function createReadStream() {
            var err;
            var readStream = dependency.read(readContext);
            if (!readStream) {
                err = new Error('Dependency did not return read stream: ' + dependency);
            }

            if (typeof readStream.pipe !== 'function') {
                err = new Error('Dependency returned invalid stream: ' + dependency);
            }

            if (err) {
                return new DeferredReadable(function() {
                    this.emit('error', err);
                    this.push(null);
                });
            }

            return readStream;
        }

        function createTransformedStream(readStream) {
            if (!transformer.hasTransforms()) {
                // simply return the dependency read stream if there are no transforms
                return readStream;
            }

            return transformer.transform(
                readStream,
                readContext);
        }

        var cache = lassoContext.cache;
        var cacheKey = dependency.getReadCacheKey();

        if (cache && dependency.shouldCache(lassoContext) && cacheKey) {
            var readCache = cache.readCache;

            dependency.getLastModified(lassoContext)
                .then((lastModified) => {
                    if (!lastModified || lastModified <= 0) {
                        // This dependency does not support caching
                        // so don't go through the caching layer
                        deferredReadable.setWrappedStream(createTransformedStream(createReadStream()));
                        return;
                    }

                    var cachedReadStream = readCache.createReadStream(
                        cacheKey,
                        {
                            lastModified: lastModified,
                            builder: function (callback) {
                                // The read dependency has not been cached
                                callback(null, createReadStream);
                            }
                        });

                    deferredReadable.setWrappedStream(createTransformedStream(cachedReadStream));
                });
        } else {
            deferredReadable.setWrappedStream(createTransformedStream(createReadStream()));
        }
    });

    return deferredReadable;
}

function createReadBundleStream(bundle, lassoContext, transformerAsyncValue) {
    var combinedStream = new CombinedStream({
        separator: '\n'
    });

    if (!bundle.hasContent()) {
        return combinedStream;
    }
    var curIndex;
    var timeoutId;
    var timeout = lassoContext.config.getBundleReadTimeout();

    if (timeout == null) {
        timeout = exports.DEFAULT_READ_TIMEOUT;
    }

    logger.info('Bundle read timeout value: ' + timeout);

    var dependencies = bundle.getDependencies();
    var len = dependencies.length;

    combinedStream.on('beginStream', function(event) {
        curIndex = event.index;

        var dependency = event.stream._dependency;
        logger.debug('(' + (curIndex + 1) + ' of ' + len + ')', 'Begin reading dependency: ', dependency.toString());

        if (timeout > 0) {
            timeoutId = setTimeout(onTimeout, timeout);
        }
    });

    combinedStream.on('error', function() {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    });

    combinedStream.on('endStream', function(event) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        var dependency = event.stream._dependency;
        logger.debug('(' + (curIndex + 1) + ' of ' + len + ')', 'Completed reading dependency: ', dependency.toString());
    });

    logger.debug('Reading bundle: ' + bundle.getKey());

    for (var i = 0; i < len; i++) {
        var dependency = dependencies[i];

        if (dependency && dependency.hasContent() && !dependency.isExternalResource(lassoContext)) {
            // Each transform needs its own lassoContext since we update the lassoContext with the
            // current dependency and each dependency is transformed in parallel
            var readContext = Object.create(lassoContext || {});
            readContext.dependency = dependency;
            readContext.bundle = bundle;

            var stream = createReadDependencyStream(dependency, readContext, transformerAsyncValue);

            // tag the stream with the dependency
            stream._dependency = dependency;

            combinedStream.addStream(stream);
        }
    }

    function onTimeout() {
        var dependency = dependencies[curIndex];
        var message = 'Reading dependency timed out after ' + timeout + 'ms: ' + dependency.toString();
        combinedStream.emit('error', new Error(message));

        combinedStream.forEachStream(function(stream) {
            if (stream.end) {
                stream.end();
            }
        });
    }

    return combinedStream;
}

function createBundleReader(bundle, lassoContext) {
    ok(bundle, 'bundle is required');
    ok(lassoContext, 'lassoContext is required');

    var transformContext = Object.create(lassoContext || {});
    transformContext.contentType = bundle.contentType;

    // TODO: Change to fully use async/await
    var transformerAsyncValue = new AsyncValue();
    transforms.createTransformer(lassoContext.config.getTransforms(), transformContext)
        .then((transformer) => {
            transformerAsyncValue.resolve(transformer);
        })
        .catch((err) => {
            transformerAsyncValue.reject(err);
        });

    return {
        readBundle: function() {
            return createReadBundleStream(bundle, lassoContext, transformerAsyncValue);
        },

        readDependency: function(dependency) {
            ok(dependency, 'dependency is required');
            ok(typeof dependency.read === 'function', 'Invalid dependency');
            return createReadDependencyStream(dependency, lassoContext, transformerAsyncValue);
        },

        async readBundleFully () {
            if (!bundle.hasContent()) return '';

            return new Promise((resolve, reject) => {
                var hasError = false;

                function handleError(e) {
                    if (hasError) {
                        return;
                    }

                    hasError = true;
                    reject(e);
                }

                var input = this.readBundle();
                var code = '';

                var captureStream = through(
                    function write (data) {
                        code += data;
                    },
                    function end () {
                        if (hasError) {
                            return;
                        }

                        resolve(code);
                    });

                input.on('error', handleError);
                captureStream.on('error', handleError);

                input.pipe(captureStream);
            });
        }
    };
}

function createResourceReader(path, lassoContext) {
    return {
        readResource (options) {
            var readStream = fs.createReadStream(path, options);

            var filename = nodePath.basename(path);
            // Use the file extension as the content type
            var contentType = filename.substring(filename.lastIndexOf('.') + 1);

            var transformContext = Object.create(lassoContext || {});
            transformContext.contentType = contentType;
            transformContext.path = path;
            transformContext.dir = nodePath.dirname(path);

            var readable = new DeferredReadable();

            transforms.createTransformer(lassoContext.config.getTransforms(), transformContext)
                .then((transformer) => {
                    if (transformer.hasTransforms() === false) {
                        // simply use the input stream since there are no transforms after the filtering
                        readable.setWrappedStream(readStream);
                        return;
                    }

                    readable.setWrappedStream(transformer.transform(
                        readStream,
                        transformContext));
                })
                .catch((err) => {
                    readable.emit('error', err);
                });

            return readable;
        }
    };
}

exports.DEFAULT_READ_TIMEOUT = 10000;
exports.readBundle = createReadBundleStream;
exports.createBundleReader = createBundleReader;
exports.createResourceReader = createResourceReader;
