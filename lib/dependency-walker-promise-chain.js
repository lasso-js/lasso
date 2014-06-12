var promises = require('raptor-promises');
var EventEmitter = require('events').EventEmitter;
var alreadyResolved = promises.resolved();
var forEachEntry = require('raptor-util').forEachEntry;

/**
 * Helper method to walk all dependencies recursively
 *
 * @param options
 */
function walk(options) {
    var emitter = new EventEmitter();
    var enabledExtensions = options.enabledExtensions;
    var context = options.context || {};
    var walkContext = {};
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
    
    function walkManifest(manifest, parentDependency, jsSlot, cssSlot) {
        var promiseChain = alreadyResolved;

        emitter.emit('manifest', manifest, walkContext);
        
        manifest.forEachDependency({
            thisObj: _this,
            enabledExtensions: enabledExtensions,
            context: options.context,
            callback: function(type, packageDependency) {
                promiseChain = promiseChain.then(function() {
                    return walkDependency(packageDependency,
                        parentDependency,
                        jsSlot,
                        cssSlot);
                });
            }
        });

        return promiseChain;
    }
    
    function walkDependency(dependency, parentDependency, jsSlot, cssSlot) {
        return dependency.calculateKey(context)
            .then(function() {
                var key = dependency.getKey();
                if (foundDependencies[key]) {
                    return alreadyResolved;
                }
                foundDependencies[key] = true;

                walkContext.parentDependency = parentDependency;

                if (!dependency.isPackageDependency()) {
                    walkContext.jsSlot = jsSlot;
                    walkContext.cssSlot = cssSlot;

                    var slot = dependency.getSlot();
                    if (!slot) {
                        if (dependency.isJavaScript()) {
                            slot = jsSlot || 'body';
                        }
                        else {
                            slot = cssSlot || 'head';
                        }
                    }

                    walkContext.slot = slot;
                }

                if (shouldSkipDependencyFunc && shouldSkipDependencyFunc(dependency, walkContext)) {
                    return alreadyResolved;
                }


                emitter.emit('dependency', dependency, walkContext);
                // console.log('DEPENDENCY: ', dependency.toString(), dependency.getKey());

                if (dependency.isPackageDependency()) {
                    var dependencyManifest = dependency.getPackageManifest(context);

                    if (!dependencyManifest) {
                        return alreadyResolved;
                    }

                    return promises.makePromise(dependencyManifest)
                        .then(function(dependencyManifest) {
                            if (dependencyManifest) {
                                return walkManifest(
                                    dependencyManifest,
                                    dependency,
                                    dependency.getJavaScriptSlot() || jsSlot,
                                    dependency.getStyleSheetSlot() || cssSlot);
                            }
                        });
                }

                return alreadyResolved;
            });
    }

    var promise;
    if (options.optimizerManifest) {
        promise = walkManifest(
            options.optimizerManifest,
            null, // parent package
            null,  // jsSlot
            null); // cssSlot
    }
    else if (options.dependency) {
        promise = walkDependency(
            options.dependency,
            null,  // parent package
            null,  // jsSlot
            null); // cssSlot
    }
    else if (options.dependencies) {
        promise = alreadyResolved;

        options.dependencies.forEach(function(d) {
            promise = promise.then(function() {
                return walkDependency(d);
            });
        });
    }
    else {
        throw new Error('"optimizerManifest", "dependency", "dependencies" is required');
    }

    var startTime = Date.now();

    promise = promise.then(function() {
        console.log('Completed walk in ' + (Date.now() - startTime) + 'ms');
        emitter.emit('end');
    });

    return promise;
}

exports.walk = walk;