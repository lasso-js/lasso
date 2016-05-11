var promises = require('raptor-promises');
var EventEmitter = require('events').EventEmitter;
var forEachEntry = require('raptor-util/forEachEntry');
var series = require('raptor-async/series');
var perfLogger = require('raptor-logging').logger('lasso/perf');
var logger = require('raptor-logging').logger(module);
var createError = require('raptor-util/createError');

/**
 * Helper method to walk all dependencies recursively
 *
 * @param options
 */
function walk(options, callback) {
    var deferred = callback ? null : promises.defer();

    var startTime = Date.now();
    var emitter = new EventEmitter();
    var lassoContext = options.lassoContext || {};
    var flags = lassoContext.flags;
    var shouldSkipDependencyFunc = options.shouldSkipDependency;

    var walkContext = {
        lassoContext: lassoContext
    };

    var on = options.on;
    if (!on) {
        return callback(new Error('"on" property is required'));
    }

    forEachEntry(on, function(event, listener) {
        emitter.on(event, listener);
    });

    var foundDependencies = {};

    function walkDependencies(dependencies, parentDependency, jsSlot, cssSlot, dependencyChain, callback) {

        logger.debug('walkDependencies', dependencies);
        var work = dependencies.map(function(dependency) {
            return function(callback) {
                walkDependency(dependency,
                    parentDependency,
                    jsSlot,
                    cssSlot,
                    dependencyChain,
                    callback);
            };
        });

        // process each dependency in series so that we add things in correct order
        series(work, function(err) {
            if (err) {
                return callback(err);
            }

            // Use setImmediate so that we don't build excessively long stack traces while
            // walking the dependency graph. Also, we use setImmediate to avoid limits
            // on how many times process.nextTick can be called. setImmediate will invoke
            // callbacks after the pending I/O events to avoid starvation of I/O event
            // processing.
            setImmediate(callback);
        });
    }

    function walkManifest(manifest, parentDependency, jsSlot, cssSlot, dependencyChain, callback) {
        delete walkContext.dependency;
        walkContext.package = manifest;
        walkContext.dependencyChain = dependencyChain;
        emitter.emit('manifest', manifest, walkContext, parentDependency);

        logger.debug('walkManifest', manifest);

        manifest.getDependencies({
                flags: flags,
                lassoContext: options.lassoContext
            },
            function(err, dependencies) {

                logger.debug('walkManifest - dependencies', dependencies);

                if (err) {
                    return callback(err);
                }

                walkDependencies(dependencies, parentDependency, jsSlot, cssSlot, dependencyChain, callback);
            });
    }

    function walkDependency(dependency, parentDependency, jsSlot, cssSlot, dependencyChain, callback) {
        dependencyChain = dependencyChain.concat(dependency);

        dependency.init(lassoContext, function(err) {
            logger.debug('dependency init', dependency);
            if (err) {
                return callback(err);
            }

            dependency.calculateKey(lassoContext, function(err, key) {
                if (err) {
                    return callback(err);
                }

                if (foundDependencies[key]) {
                    return callback();
                }
                foundDependencies[key] = true;

                var slot;

                if (!dependency.isPackageDependency()) {
                    slot = dependency.getSlot();
                    if (!slot) {
                        if (dependency.isJavaScript()) {
                            slot = jsSlot || 'body';
                        }
                        else {
                            slot = cssSlot || 'head';
                        }
                    }
                }

                walkContext.slot = slot;
                delete walkContext.package;
                walkContext.dependency = dependency;
                walkContext.parentDependency = parentDependency;
                walkContext.dependencyChain = dependencyChain;

                if (shouldSkipDependencyFunc && shouldSkipDependencyFunc(dependency, walkContext)) {
                    return callback();
                }

                emitter.emit('dependency', dependency, walkContext);

                if (dependency.isPackageDependency()) {
                    dependency.getPackageManifest(lassoContext, function(err, dependencyManifest) {
                        if (err) {
                            var message = 'Failed to walk dependency ' + dependency + '. Dependency chain: ' + dependencyChain.join(' → ') + '. Cause: ' + err;
                            var wrappedError = createError(message, err);
                            return callback(wrappedError);
                        }

                        if (!dependencyManifest) {
                            return callback();
                        }

                        walkManifest(
                            dependencyManifest,
                            dependency,
                            dependency.getJavaScriptSlot() || jsSlot,
                            dependency.getStyleSheetSlot() || cssSlot,
                            dependencyChain,
                            callback);
                    });
                } else {
                    return callback();
                }
            });
        });
    }

    function done(err) {

        if (err) {
            if (callback) {
                callback(err);
            } else {
                deferred.reject(err);
            }
        } else {
            perfLogger.debug('Completed walk in ' + (Date.now() - startTime) + 'ms');

            emitter.emit('end');

            if (callback) {
                callback();
            } else {
                deferred.resolve();
            }
        }
    }

    var dependencyChain = [];

    if (options.lassoManifest) {
        walkManifest(
            options.lassoManifest,
            null, // parent package
            null,  // jsSlot
            null,
            dependencyChain,
            done); // cssSlot
    } else if (options.dependency) {
        walkDependency(
            options.dependency,
            null,  // parent package
            null,  // jsSlot
            null,
            dependencyChain,
            done); // cssSlot
    } else if (options.dependencies) {
        options.dependencies.normalize(function(err, dependencies) {
            walkDependencies(
                dependencies,
                null,
                null,
                null,
                dependencyChain,
                done);
        });
    } else {
        return callback(new Error('"lassoManifest", "dependency", "dependencies" is required'));
    }

    return callback ? null : deferred.promise;
}

exports.walk = walk;
