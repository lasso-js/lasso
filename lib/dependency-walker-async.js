var promises = require('raptor-promises');
var EventEmitter = require('events').EventEmitter;
var forEachEntry = require('raptor-util/forEachEntry');
var raptorAsync = require('raptor-async');
var perfLogger = require('raptor-logging').logger('raptor-optimizer/perf');

/**
 * Helper method to walk all dependencies recursively
 *
 * @param options
 */
function walk(options, callback) {
    var deferred = callback ? null : promises.defer();
    var walkContext = {};
    var startTime = Date.now();
    var emitter = new EventEmitter();
    var enabledExtensions = options.enabledExtensions;
    var context = options.context || {};
    var _this = this;
    var shouldSkipDependencyFunc = options.shouldSkipDependency;

    var on = options.on;
    if (!on) {
        throw new Error('"on" property is required');
    }

    forEachEntry(on, function(event, listener) {
        emitter.on(event, listener);
    });

    var foundDependencies = {};
    
    function walkManifest(manifest, parentDependency, jsSlot, cssSlot, callback) {
        emitter.emit('manifest', manifest);

        var work = [];
        
        manifest.forEachDependency({
            thisObj: _this,
            enabledExtensions: enabledExtensions,
            context: options.context,
            callback: function(type, packageDependency) {
                work.push(function(callback) {
                    walkDependency(packageDependency,
                        parentDependency,
                        jsSlot,
                        cssSlot,
                        callback);
                });
            }
        });

        raptorAsync.series(work, callback);
    }
    
    function walkDependency(dependency, parentDependency, jsSlot, cssSlot, callback) {
        dependency.calculateKey(context, function(err, key) {
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
            walkContext.parentDependency = parentDependency;

            if (shouldSkipDependencyFunc && shouldSkipDependencyFunc(dependency, walkContext)) {
                return callback();
            }

            emitter.emit('dependency', dependency, walkContext);

            if (dependency.isPackageDependency()) {
                dependency.getPackageManifest(context, function(err, dependencyManifest) {
                    if (err) {
                        return callback(err);
                    }
                    
                    if (!dependencyManifest) {
                        return callback();
                    }

                    walkManifest(
                        dependencyManifest,
                        dependency,
                        dependency.getJavaScriptSlot() || jsSlot,
                        dependency.getStyleSheetSlot() || cssSlot,
                        callback);
                });
            } else {
                return callback();
            }
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

    if (options.optimizerManifest) {
        walkManifest(
            options.optimizerManifest,
            null, // parent package
            null,  // jsSlot
            null,
            done); // cssSlot
    }
    else if (options.dependency) {
        walkDependency(
            options.dependency,
            null,  // parent package
            null,  // jsSlot
            null,
            done); // cssSlot
    }
    else if (options.dependencies) {

        var work = [];

        options.dependencies.forEach(function(d) {
            work.push(function(callback) {
                walkDependency(d, null, null, null, callback);
            });
        });

        raptorAsync.series(work, done);
    }
    else {
        throw new Error('"optimizerManifest", "dependency", "dependencies" is required');
    }

    return callback ? null : deferred.promise;
}

exports.walk = walk;
