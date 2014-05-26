var transforms = require('./transforms');
var CombinedStream = require('combined-stream');
var eventStream = require('event-stream');
var logger = require('raptor-logging').logger(module);
var resumer = require('resumer');
var ok = require('assert').ok;
var fs = require('fs');

function readDependency(dependency, context) {
    var contentType = dependency.getContentType();
    
    var input = dependency.readStream(context);
    if (!input) {
        throw new Error('Dependency did not return read stream: ' + dependency);
    }

    if (!input.on) {
        throw new Error('Dependency returned invalid stream: ' + dependency);
    }

    var transformContext = Object.create(context || {});
    transformContext.contentType = contentType;
    transformContext.dependency = dependency;

    return transforms.applyTransforms(input, contentType, transformContext);
}

function readBundle(bundle, context) {


    logger.debug('Reading bundle: ' + bundle.getKey());

    var dependencies = bundle.getDependencies();

    var combinedStream = CombinedStream.create({maxDataSize: Infinity});

    function handleError(e) {
        combinedStream.emit('error', e);
    }

    dependencies.forEach(function(dependency, i) {

        if (dependency.isExternalResource(context)) {
            return;
        }
        
        // Each transform needs its own context since we update the context with the
        // current dependency and each dependency is transformed in parallel
        var readContext = Object.create(context || {});
        readContext.dependency = dependency;
        readContext.bundle = bundle;

        if (i !== 0) {
            // Add a new line as a delimiter between each dependency
            combinedStream.append(eventStream.readArray(['\n']));
        }

        if (logger.isInfoEnabled()) {
            logger.info('Begin reading dependency: ', dependency.toString());
        }

        var readDependencyStream = readDependency(dependency, readContext);
        if (!readDependencyStream) {
            readDependencyStream = resumer().end();
        }
        else if (typeof readDependencyStream.pipe !== 'function') {
            throw new Error('Invalid stream returned');
        }

        var timeout = 1800;

        readDependencyStream.on('error', handleError);
        var timeoutId = setTimeout(function() {
            var message = 'Reading dependency timed out after ' + timeout + 'ms: ' + dependency.toString();
            logger.error(message);
            readDependencyStream.emit('error', new Error(message));
            readDependencyStream.end();
        }, timeout);

        // readDependencyStream.pause();

        readDependencyStream.on('end', function() {
            clearTimeout(timeoutId);

            if (logger.isInfoEnabled()) {
                logger.info('Completed reading dependency: ', dependency.toString());// + ':\n' + dependencyData);
            }
        });

        combinedStream.append(readDependencyStream);
    });

    if (logger.isInfoEnabled()) {
        combinedStream.on('end', function() {
            logger.info('Completed reading bundle: ', bundle.toString());
        });
        
    }

    return combinedStream;
}

function createBundleReader(bundle, context) {
    ok(bundle, 'bundle is required');
    ok(context, 'context is required');

    return {
        readBundle: function() {
            return readBundle(bundle, context);
        },

        readDependency: function(dependency) {
            ok(dependency, 'dependency is required');
            ok(typeof dependency.readStream === 'function', 'Invalid dependency');

            return readDependency(dependency, context);
        },

        readBundleFully: function(callback) {
            ok(typeof callback === 'function', 'Invalid callback');

            function handleError(e) {
                callback(e);
            }

            var input = this.readBundle();
            var code = '';
            var dest = eventStream.through(function write(data) {
                    code += data;
                },
                function end() {
                    callback(null, code);
                });

            input.on('error', handleError);
            dest.on('error', handleError);

            input.pipe(dest);
        }
    };
}

function createResourceReader(path, context) {
    return {
        readResource: function() {
            return fs.createReadStream(path);
        }
    };
}

exports.readDependency = readDependency;
exports.readBundle = readBundle;
exports.createBundleReader = createBundleReader;
exports.createResourceReader = createResourceReader;