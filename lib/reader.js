var transforms = require('./transforms');
var through = require('through');
var logger = require('raptor-logging').logger(module);
var ok = require('assert').ok;
var fs = require('fs');
//var Readable = require('stream').Readable;
var CombinedStream = require('./util/CombinedStream');
var DeferredReadable = require('./util/DeferredReadable');
var nodePath = require('path');

function createReadDependencyStream(dependency, optimizerContext, transformer) {
    var contentType = dependency.getContentType();

    var readContext = Object.create(optimizerContext || {});
    readContext.contentType = contentType;
    readContext.dependency = dependency;
    readContext.transformer = transformer;

    function reader() {
        var err;
        var readStream = dependency.read(optimizerContext);
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

        if (!transformer.hasTransforms()) {
            // simply return the dependency read stream if there are no transforms
            return readStream;
        }

        return transformer.transform(
            readStream,
            contentType,
            readContext,
            dependency);
    }

    var cache = optimizerContext.cache;
    var cacheKey = dependency.getReadCacheKey();

    if (cache && dependency.shouldCache(optimizerContext) && cacheKey) {
        var readCache = cache.readCache;

        var deferredReadable = new DeferredReadable();

        dependency.getLastModified(optimizerContext, function(err, lastModified) {
            if (!lastModified || lastModified <= 0) {
                // This dependency does not support caching
                // so don't go through the caching layer
                deferredReadable.setWrappedStream(reader());
                return;
            }

            var cachedReadStream = readCache.createReadStream(
                cacheKey,
                {
                    lastModified: lastModified,
                    builder: function (callback) {
                        // The read dependency has not been cached
                        callback(null, reader);
                    }
                });

            deferredReadable.setWrappedStream(cachedReadStream);
        });

        return deferredReadable;

    } else {
        return reader();
    }
}

function createReadBundleStream(bundle, optimizerContext) {
    var combinedStream = new CombinedStream({
        separator: '\n',
    });

    if (!bundle.hasContent()) {
        return combinedStream;
    }

    logger.debug('Reading bundle: ' + bundle.getKey());

    var dependencies = bundle.getDependencies();
    var len = dependencies.length;

    var transformer = transforms.createTransformer(optimizerContext.config.getTransforms(), bundle.getContentType());

    for (var i = 0; i < len; i++) {
        var dependency = dependencies[i];

        if (dependency && dependency.hasContent() && !dependency.isExternalResource(optimizerContext)) {
            // Each transform needs its own optimizerContext since we update the optimizerContext with the
            // current dependency and each dependency is transformed in parallel
            var readContext = Object.create(optimizerContext || {});
            readContext.dependency = dependency;
            readContext.bundle = bundle;

            var stream = createReadDependencyStream(dependency, readContext, transformer);

            // tag the stream with the dependency
            stream._dependency = dependency;

            combinedStream.addStream(stream);
        }
    }

    var curIndex;
    var timeoutId;
    var timeout = 1800;

    len = combinedStream.getStreamCount();

    if (len === 0) {
        return combinedStream;
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

    combinedStream.on('beginStream', function(event) {
        curIndex = event.index;

        var dependency = event.stream._dependency;
        logger.debug('(' + (curIndex+1) + ' of ' + len + ')', 'Begin reading dependency: ', dependency.toString());

        timeoutId = setTimeout(onTimeout, timeout);
    });

    combinedStream.on('endStream', function(event) {
        clearTimeout(timeoutId);

        var dependency = event.stream._dependency;
        logger.debug('(' + (curIndex+1) + ' of ' + len + ')', 'Completed reading dependency: ', dependency.toString());
    });

    return combinedStream;
}

function createBundleReader(bundle, optimizerContext) {
    ok(bundle, 'bundle is required');
    ok(optimizerContext, 'optimizerContext is required');

    return {
        readBundle: function() {
            return createReadBundleStream(bundle, optimizerContext);
        },

        readDependency: function(dependency) {
            ok(dependency, 'dependency is required');
            ok(typeof dependency.read === 'function', 'Invalid dependency');

            var transformer = transforms.createTransformer(optimizerContext.config.getTransforms(), bundle.contentType);
            return createReadDependencyStream(dependency, optimizerContext, transformer);
        },

        readBundleFully: function(callback) {
            if (!bundle.hasContent()) {
                return callback(null, '');
            }

            ok(typeof callback === 'function', 'Invalid callback');

            function handleError(e) {
                callback(e);
            }

            var input = this.readBundle();
            var code = '';
            var captureStream = through(
                function write(data) {
                    code += data;
                },
                function end() {
                    callback(null, code);
                });

            input.on('error', handleError);
            captureStream.on('error', handleError);

            input.pipe(captureStream);
        }
    };
}

function createResourceReader(path, optimizerContext) {
    return {
        readResource: function(options) {
            var readStream = fs.createReadStream(path, options);

            var filename = nodePath.basename(path);
            // Use the file extension as the content type
            var contentType = filename.substring(filename.lastIndexOf('.')+1);

            var transformer = transforms.createTransformer(
                optimizerContext.config.getTransforms(), contentType);

            if (transformer.hasTransforms() === false) {
                // simply return the dependency read stream if there are no transforms
                return readStream;
            }

            var transformContext = Object.create(optimizerContext || {});
            transformContext.contentType = contentType;
            transformContext.path = path;

            return transformer.transform(
                readStream,
                contentType,
                transformContext);
        }
    };
}

exports.readBundle = createReadBundleStream;
exports.createBundleReader = createBundleReader;
exports.createResourceReader = createResourceReader;
