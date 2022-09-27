const transforms = require('./transforms');
const through = require('through');
const logger = require('raptor-logging').logger(module);
const ok = require('assert').ok;
const fs = require('fs');
const CombinedStream = require('./util/CombinedStream');
const DeferredReadable = require('./util/DeferredReadable');
const nodePath = require('path');
const AsyncValue = require('raptor-async/AsyncValue');

function createReadDependencyStream(dependency, lassoContext, transformerAsyncValue) {
    const deferredReadable = new DeferredReadable();

    transformerAsyncValue.done(function(err, transformer) {
        if (err) {
            deferredReadable.emit('error', err);
            return;
        }

        const contentType = dependency.getContentType();

        const readContext = Object.create(lassoContext || {});
        readContext.contentType = contentType;
        readContext.dependency = dependency;
        readContext.transformer = transformer;
        readContext.dir = dependency.getDir ? dependency.getDir(lassoContext) : null;

        if (dependency.getSourceFile) {
            readContext.path = dependency.getSourceFile();
        }

        function createReadStream() {
            let err;
            const readStream = dependency.read(readContext);
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

        const cache = lassoContext.cache;
        const cacheKey = dependency.getReadCacheKey();

        if (cache && dependency.shouldCache(lassoContext) && cacheKey) {
            const readCache = cache.readCache;

            dependency.getLastModified(lassoContext)
                .then((lastModified) => {
                    if (!lastModified || lastModified <= 0) {
                        // This dependency does not support caching
                        // so don't go through the caching layer
                        deferredReadable.setWrappedStream(createTransformedStream(createReadStream()));
                        return;
                    }

                    const cachedReadStream = readCache.createReadStream(
                        cacheKey,
                        {
                            lastModified,
                            builder: function () {
                                // The read dependency has not been cached
                                return Promise.resolve(createReadStream);
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
    const combinedStream = new CombinedStream({
        separator: '\n'
    });

    if (!bundle.hasContent()) {
        return combinedStream;
    }
    let curIndex;
    let timeoutId;
    let timeout = lassoContext.config.getBundleReadTimeout();

    if (timeout == null) {
        timeout = exports.DEFAULT_READ_TIMEOUT;
    }

    logger.info('Bundle read timeout value: ' + timeout);

    const dependencies = bundle.getDependencies();
    const len = dependencies.length;

    combinedStream.on('beginStream', function(event) {
        curIndex = event.index;

        const dependency = event.stream._dependency;
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

        const dependency = event.stream._dependency;
        logger.debug('(' + (curIndex + 1) + ' of ' + len + ')', 'Completed reading dependency: ', dependency.toString());
    });

    logger.debug('Reading bundle: ' + bundle.getKey());

    for (let i = 0; i < len; i++) {
        const dependency = dependencies[i];

        if (dependency && dependency.hasContent() && !dependency.isExternalResource(lassoContext)) {
            // Each transform needs its own lassoContext since we update the lassoContext with the
            // current dependency and each dependency is transformed in parallel
            const readContext = Object.create(lassoContext || {});
            readContext.dependency = dependency;
            readContext.bundle = bundle;

            const stream = createReadDependencyStream(dependency, readContext, transformerAsyncValue);

            // tag the stream with the dependency
            stream._dependency = dependency;

            combinedStream.addStream(stream);
        }
    }

    function onTimeout() {
        const dependency = dependencies[curIndex];
        const message = 'Reading dependency timed out after ' + timeout + 'ms: ' + dependency.toString() + '. The timeout value can be set via the bundleReadTimeout configuration option (defaults to ' + exports.DEFAULT_READ_TIMEOUT + ').';
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

    const transformContext = Object.create(lassoContext || {});
    transformContext.contentType = bundle.contentType;

    // TODO: Change to fully use async/await
    const transformerAsyncValue = new AsyncValue();
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
                let hasError = false;

                function handleError(e) {
                    if (hasError) {
                        return;
                    }

                    hasError = true;
                    reject(e);
                }

                const input = this.readBundle();
                let code = '';

                const captureStream = through(
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
            const readStream = fs.createReadStream(path, options);

            const filename = nodePath.basename(path);
            // Use the file extension as the content type
            const contentType = filename.substring(filename.lastIndexOf('.') + 1);

            const transformContext = Object.create(lassoContext || {});
            transformContext.contentType = contentType;
            transformContext.path = path;
            transformContext.dir = nodePath.dirname(path);

            const readable = new DeferredReadable();

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
