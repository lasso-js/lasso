var transforms = require('./transforms');
var through = require('through');
var logger = require('raptor-logging').logger(module);
var ok = require('assert').ok;
var fs = require('fs');
//var Readable = require('stream').Readable;
var CombinedStream = require('./util/CombinedStream');
var DeferredReadable = require('./util/DeferredReadable');

function createReadDependencyStream(dependency, context) {

    var err;
    var readStream = dependency.read(context);
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

    var availableTransforms = context.config.getTransforms();
    if (!availableTransforms || availableTransforms.length === 0) {
        // simply return the dependency read stream if there are no transforms
        return readStream;
    }

    var contentType = dependency.getContentType();

    var transformContext = Object.create(context || {});
    transformContext.contentType = contentType;
    transformContext.dependency = dependency;

    return transforms.applyTransforms(availableTransforms, readStream, contentType, transformContext, dependency);
}

function createReadBundleStream(bundle, context) {
    var combinedStream = new CombinedStream({
        separator: '\n',
    });

    if (!bundle.hasContent()) {
        return combinedStream;
    }

    logger.debug('Reading bundle: ' + bundle.getKey());

    var dependencies = bundle.getDependencies();
    var len = dependencies.length;

    for (var i = 0; i < len; i++) {
        var dependency = dependencies[i];

        if (dependency && dependency.hasContent() && !dependency.isExternalResource(context)) {
            // Each transform needs its own context since we update the context with the
            // current dependency and each dependency is transformed in parallel
            var readContext = Object.create(context || {});
            readContext.dependency = dependency;
            readContext.bundle = bundle;

            var stream = createReadDependencyStream(dependency, readContext);

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
            ok(typeof dependency.readStream === 'function', 'Invalid dependency');

            return createReadDependencyStream(dependency, optimizerContext);
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
            return fs.createReadStream(path, options);
        }
    };
}

exports.readBundle = createReadBundleStream;
exports.createBundleReader = createBundleReader;
exports.createResourceReader = createResourceReader;
