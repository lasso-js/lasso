var filters = require('./filters');
var CombinedStream = require('combined-stream');
var eventStream = require('event-stream');
var logger = require('raptor-logging').logger(module);
var resumer = require('resumer');

function readDependency(dependency, context) {
    var contentType = dependency.getContentType();
    
    var input = dependency.read(context);
    if (!input) {
        throw new Error('Dependency return null read stream: ' + dependency);
    }

    var filterContext = Object.create(context || {});
    filterContext.contentType = contentType;
    filterContext.dependency = dependency;

    return filters.applyFilters(input, contentType, filterContext);
}

function readBundle(bundle, context) {


    logger.debug("Reading bundle: " + bundle.getKey());

    var dependencies = bundle.getDependencies();

    var combinedStream = CombinedStream.create({maxDataSize: Infinity,});

    function handleError(e) {
        combinedStream.emit('error', e);
    }

    dependencies.forEach(function(dependency, i) {
        // Each filter needs its own context since we update the context with the
        // current dependency and each dependency is filtered in parallel
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

        readDependencyStream.on('error', handleError);
        var timeoutId = setTimeout(function() {
            var message = 'Reading dependency timed out: ' + dependency.toString();
            logger.error(message);
            readDependencyStream.emit('error', new Error(message));
            readDependencyStream.end();
        }, 1800);

        // readDependencyStream.pause();

        readDependencyStream.on('end', function() {
            clearTimeout(timeoutId);

            if (logger.isInfoEnabled()) {
                logger.info('Completed reading dependency: ', dependency.toString());// + ':\n' + dependencyData);
            }
        }); 

        combinedStream.append(readDependencyStream);
    });

    return combinedStream;
}

exports.readDependency = readDependency;
exports.readBundle = readBundle;