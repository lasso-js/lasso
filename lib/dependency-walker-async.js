var promises = require('raptor-promises');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var forEachEntry = require('raptor-util/forEachEntry');
var AsyncDataContext = require('./AsyncDataContext');
var through = require('through');
var util = require('util');

function DependencyTask(dependency, walkContext, asyncDataContext, walker) {
    this.dependency = dependency;
    this.walkContext = walkContext || {};
    this.asyncDataContext = asyncDataContext;
    this.walker = walker;
}

DependencyTask.prototype = {
    run: function(callback) {
        var dependency = this.dependency;
        var walker = this.walker;
        var walkContext = this.walkContext;
        var asyncDataContext = this.asyncDataContext;

        var jsSlot = walkContext.jsSlot;
        var cssSlot = walkContext.cssSlot;

        return dependency.calculateKey(walker.context)
            .then(function() {
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

                    walkContext = {
                        parentDependency: walkContext.parentDependency,
                        slot: slot
                    };
                }

                if (walker.shouldSkipDependency(dependency, walkContext)) {
                    return callback();
                }

                // console.log('DEPENDENCY: ' + dependency, 'SLOT: ', walkContext.slot);

                asyncDataContext.write({
                    type: 'dependency',
                    dependency: dependency,
                    walkContext: walkContext
                });

                if (dependency.isPackageDependency()) {

                    dependency.getPackageManifest(walker.context, function(err, dependencyManifest) {

                        if (dependencyManifest.then) {
                            err = new Error('dependencyManifest is a promise!');
                        }
                        if (err) {
                            return callback(err);
                        }

                        if (!dependencyManifest) {
                            return;
                        }

                        walker.addPackageTask(
                            dependencyManifest,
                            {
                                jsSlot: dependency.getJavaScriptSlot() || jsSlot,
                                cssSlot: dependency.getStyleSheetSlot() || cssSlot,
                                parentDependency: dependency
                            },
                            asyncDataContext);

                        callback();
                    });   
                } else {
                    callback();    
                }

                
            });
    },
    toString: function() {
        var slots = { jsSlot: this.walkContext.jsSlot, cssSlot: this.walkContext.cssSlot, slot: this.walkContext.slot};
        return '[DependencyTask: ' + this.dependency + ',\n    ' + util.inspect(slots) + ']';
    }
};

function PackageTask(manifest, walkContext, asyncDataContext, walker) {
    this.manifest = manifest;
    this.walkContext = walkContext;
    this.asyncDataContext = asyncDataContext;
    this.walker = walker;
}

PackageTask.prototype = {
    run: function(callback) {
        // console.log('PACKAGE TASK', this.manifest, typeof this.manifest, Object.keys(this.manifest));
        var manifest = this.manifest;
        var context = this.context;
        var enabledExtensions = this.enabledExtensions;
        var asyncDataContext = this.asyncDataContext;
        var walker = this.walker;
        var walkContext = this.walkContext;


        asyncDataContext.write({
            type: 'manifest',
            manifest: manifest,
            walkContext: walkContext
        });
        
        manifest.forEachDependency({
            enabledExtensions: enabledExtensions,
            context: context,
            callback: function(type, packageDependency) {
                walker.addDependencyTask(packageDependency, walkContext, asyncDataContext);
            }
        });

        callback();
    },
    toString: function() {
        var slots = { jsSlot: this.walkContext.jsSlot, cssSlot: this.walkContext.cssSlot, slot: this.walkContext.slot};
        return '[PackageTask: ' + util.inspect(this.manifest.filename) + ', ' + util.inspect(slots) + ']';
    }
};

function Walker(options) {
    this.options = options;
    var emitter = this.emitter = new EventEmitter();
    this.enabledExtensions = options.enabledExtensions;
    this.context = options.context || {};
    this.shouldSkipDependencyFunc = options.shouldSkipDependency;
    this.foundDependencies = {};
    this.queue = null;
     

    var on = options.on;
    if (!on) {
        throw new Error('"on" property is required');
    }

    forEachEntry(on, function(event, listener) {
        emitter.on(event, listener);
    });
}

Walker.prototype = {
    wasDependencyWalked: function(dependency) {
        return this.foundDependencies[dependency.getKey()] === true;
    },

    markDependencyWalked: function(dependency) {
        this.foundDependencies[dependency.getKey()] = true;
    },

    walk: function(callback) {
        var _this = this;
        
        var startTime = Date.now();
        var hadError = false;

        function handleError(err) {
            if (hadError) {
                return;
            }

            hadError = true;
            
            queue.kill();
            callback(err);
        }

        var queue = this.queue = async.queue(function (task, taskCallback) {
            // var taskStr = task.toString();
            // console.log('Starting task: ' + taskStr);
            task.run(function(err) {
                if (err) {
                    // console.log('Task failed: ' + taskStr, err);
                    return handleError(err);
                }

                // console.log('Completed task: ' + taskStr);    
                
                taskCallback();
            });
        }, 10); 

        var stream = through()
            .on('data', function(data) {
                if (hadError) {
                    return;
                }

                if (data.type === 'dependency') {

                    var dependency = data.dependency;
                    if (_this.wasDependencyWalked(dependency)) {
                        return;
                    }

                    _this.markDependencyWalked(dependency);

                    // console.log('WALK DEPENDENCY: ', dependency.toString());

                    _this.emitter.emit('dependency', dependency, data.walkContext);

                } else if (data.type === 'manifest') {
                    // console.log('WALK MANIFEST: ', data.manifest);
                    _this.emitter.emit('manifest', data.manifest, data.walkContext);
                }
            })
            .on('end', function() {
                if (hadError) {
                    return;
                }

                console.log('Completed walk in ' + (Date.now() - startTime) + 'ms');
                callback();
            })
            .on('error', function(err) {
                handleError(err);
            });


        var asyncDataContext = new AsyncDataContext(stream);

        var options = this.options;

        if (options.optimizerManifest) {
            this.addPackageTask(options.optimizerManifest, {}, asyncDataContext);
        } else if (options.dependency) {
            this.addDependencyTask(options.dependency, {}, asyncDataContext);
        } else if (options.dependencies) {
            options.dependencies.forEach(function(d) {
                _this.addDependencyTask(d, {}, asyncDataContext);
            });

        } else {
            throw new Error('One of "optimizerManifest", "dependency" or "dependencies" is required');
        }



        asyncDataContext.end();
    },

    addDependencyTask: function(dependency, walkContext, parentAsyncDataContext) {
        var asyncDataContext = parentAsyncDataContext.beginAsync();
        this.queue.push(new DependencyTask(dependency, walkContext || {}, asyncDataContext, this), function(err, data) {
            if (err) {
                asyncDataContext.error(err);
                return;
            }
            asyncDataContext.end();
        });
    },

    addPackageTask: function(manifest, walkContext, parentAsyncDataContext) {
        var asyncDataContext = parentAsyncDataContext.beginAsync();
        this.queue.push(new PackageTask(manifest, walkContext || {}, asyncDataContext, this), function(err, data) {
            if (err) {
                asyncDataContext.error(err);
            }
            asyncDataContext.end();
        });
    },

    shouldSkipDependency: function(dependency, walkContext) {
        var shouldSkipDependencyFunc = this.shouldSkipDependencyFunc;
        if (shouldSkipDependencyFunc && shouldSkipDependencyFunc(dependency, walkContext)) {
            return true;
        } else {
            return false;
        }
    }
};

function walk(options, callback) {
    var deferred = callback ? null : promises.defer();

    var walker = new Walker(options);
    walker.walk(function(err) {
        if (callback) {
            callback(err);
        } else {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve();
            }
        }
    });
    
    return callback ? null : deferred.promise;
}

exports.walk = walk;