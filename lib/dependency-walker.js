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

    var on = options.on;
    if (!on) {
        throw new Error('"on" property is required');
    }

    forEachEntry(on, function(event, listener) {
        emitter.on(event, listener);
    });

    var foundDependencies = {};
    
    function walkManifest(manifest, parentDependency, async, jsSlot, cssSlot) {
        walkContext.async = async === true;
        walkContext.jsSlot = jsSlot;
        walkContext.cssSlot = cssSlot;
        walkContext.parentDependency = parentDependency;

        var skipPackage = false;
        walkContext.skipPackage = function() {
            skipPackage = true;
        };

        emitter.emit('package', manifest, parentDependency, walkContext);

        if (skipPackage) {
            return alreadyResolved;
        }
        
        var promiseChain = alreadyResolved;

        manifest.forEachDependency(
            function(type, packageDependency) {
                
                promiseChain = promiseChain.then(function() {
                    return walkDependency(packageDependency,
                        parentDependency,
                        async || packageDependency.isAsync(),
                        jsSlot,
                        cssSlot);
                });
            },
            _this,
            {
                enabledExtensions: enabledExtensions
            });

        return promiseChain;
    }
    
    function walkDependency(dependency, parentDependency, async, jsSlot, cssSlot) {
        return dependency.calculateKey()
            .then(function() {
                if (foundDependencies[dependency.getKey()]) {
                    return alreadyResolved;
                }
                foundDependencies[dependency.getKey()] = true;

                async = async === true || dependency.async === true;

                walkContext.async = async;
                walkContext.parentDependency = parentDependency;
                walkContext.skipPackage = null;

                var skipPackage = false;

                if (dependency.isPackageDependency()) {
                    
                    walkContext.skipPackage = function() {
                        skipPackage = true;
                    };
                }
                else {
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

                emitter.emit('dependency', dependency, walkContext);

                if (dependency.isPackageDependency() && !skipPackage) {
                    var dependencyManifest = dependency.getPackageManifest(context);

                    if (!dependencyManifest) {
                        throw new Error("Dependency manifest not found for package dependency: " + dependency.toString());
                    }

                    return promises.resolved(dependencyManifest)
                        .then(function(dependencyManifest) {
                            return walkManifest(
                                dependencyManifest,
                                dependency,
                                async, 
                                dependency.getJavaScriptSlot() || jsSlot, 
                                dependency.getStyleSheetSlot() || cssSlot);
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
            false, // async = false
            null,  // jsSlot
            null); // cssSlot 
    }
    else if (options.dependency) {
        promise = walkDependency(
            options.dependency,
            null,  // parent package
            false, // async = false
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

    promise = promise.then(function() {
        emitter.emit('end');
    });

    return promise;
}

exports.walk = walk;