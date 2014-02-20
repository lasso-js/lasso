var promises = require('raptor-promises');
var EventEmitter = require('events').EventEmitter;
var forEachEntry = require('raptor-util').forEachEntry;

function Task(dependency, parentWalkContext, walker) {
    this.dependency = dependency;
    this.context = walker.context;
    this.foundDependencies = walker.foundDependencies;
    this.emitter = walker.emitter;
    this.walker = walker;
    this.next = null;

    this.skip = false;
    this.previousWalked = false;
    this.ready = false;
    this.shouldSkipDependencyFunc = walker.shouldSkipDependencyFunc;

    var walkContext;

    if (parentWalkContext) {
        walkContext = {
            async: dependency.isAsync() || parentWalkContext.async === true,
            parentDependency: parentWalkContext.dependency,
            dependency: dependency
        };

        walkContext.jsSlot = dependency.getJavaScriptSlot() || parentWalkContext.jsSlot;
        walkContext.cssSlot = dependency.getStyleSheetSlot() || parentWalkContext.cssSlot;
    } else {
        walkContext = {
            dependency: dependency,
            parentDependency: null,
            async: false,
            jsSlot: dependency.getJavaScriptSlot(),
            cssSlot: dependency.getStyleSheetSlot()
        };
    }

    if (!dependency.isPackageDependency()) {
        var slot = dependency.getSlot();
        if (!slot) {
            if (dependency.isJavaScript()) {
                slot = walkContext.jsSlot || 'body';
            }
            else {
                slot = walkContext.cssSlot || 'head';
            }
        }

        walkContext.slot = slot;
    }
    
    this.walkContext = walkContext;
}

Task.prototype = {
    start: function() {
        var _this = this;
        var walker = this.walker;
        
        var dependency = this.dependency;
        dependency.calculateKey(this.context)
            .then(function() {
                if (walker.ended) {
                    return;
                }

                if (walker.shouldSkipDependencyFunc && walker.shouldSkipDependencyFunc(dependency, _this.walkContext)) {
                    _this.skip = true;
                }

                if (!_this.skip && dependency.isPackageDependency()) {
                    _this.manifest = dependency.getPackageManifest(_this.context);
                }

                _this.ready = true;
                _this.walk();
            })
            .fail(function(e) {
                if (walker.ended) {
                    return;
                }

                walker.error(e);
            });
    },    

    walk: function() {
        if (this.walker.ended) {
            return;
        }

        if (!this.previousWalked || !this.ready) {
            return;
        }

        var skip = this.skip;

        var foundDependencies = this.foundDependencies;

        if (!skip) {
            if (foundDependencies[this.dependency.getKey()]) {
                skip = true;
            }
        }

        foundDependencies[this.dependency.getKey()] = true;

        this.walked = true;

        if (skip) {
            this.walkNext();
        } else {
            var dependency = this.dependency;
            this.emitter.emit('dependency', dependency, this.walkContext);

            this.afterWalk();
        }
    },

    afterWalk: function() {
        if (this.skip) {
            throw new Error('Illegal state');
        }

        var dependency = this.dependency;
        var walker = this.walker;
        var walkContext = this.walkContext;
        var _this = this;

        if (dependency.isPackageDependency()) {
            if (!this.manifest) {
                walker.error(new Error("Dependency manifest not found for package dependency: " + dependency.toString()));
                return;
            }

            return promises.resolved(this.manifest)
                .then(function(manifest) {
                    if (walker.ended) {
                        return;
                    }

                    var after = _this;

                    manifest.forEachDependency(
                        function(type, packageDependency) {
                            var newTask = new Task(packageDependency, walkContext, walker);
                            walker.insertAfter(after, newTask);
                            newTask.start();
                            after = newTask;
                        },
                        _this,
                        {
                            enabledExtensions: walker.enabledExtensions
                        });

                    _this.walkNext();

                })
                .fail(function(e) {
                    this.walker.error(e);
                });
        } else {
            this.walkNext();
        }
    },

    walkNext: function() {
        if (this.walker.ended) {
            return;
        }

        if (!this.walked) {
            throw new Error('Illegal state');
        }

        if (this.next) {
            this.next.previousWalked = true;
            this.next.walk();
        } else {
            this.walker.end();
        }
    }
};

function Walker(options) {
    this.ended = false;
    this.tasks = [];
    this.context = options.context;
    this.shouldSkipDependencyFunc = options.shouldSkipDependency;
    var emitter = this.emitter = new EventEmitter();
    this.foundDependencies = {};
    this.enabledExtensions = options.enabledExtensions;

    this.deferred = promises.defer();

    var on = options.on;
    if (!on) {
        throw new Error('"on" property is required');
    }

    forEachEntry(on, function(event, listener) {
        if (event === 'package') {
            throw new Error('"package" is no longer supported');
        }

        emitter.on(event, listener);
    });
}

Walker.prototype = {
    start: function() {
        if (this.tasks.length) {
            this.tasks.forEach(function(task) {
                task.start();
            });    
        }
        else {
            this.end();
        }
        
        return this.deferred.promise;
    },

    addDependency: function(dependency) {
        var prevTask = this.tasks.length ? this.tasks[this.tasks.length-1] : null;
        var task = new Task(dependency, null, this);

        if (prevTask) {
            prevTask.next = task;
        } else {
            task.previousWalked = true;
        }

        this.tasks.push(task);
    },

    insertAfter: function(afterTask, newTask) {
        newTask.next = afterTask.next;
        afterTask.next = newTask;
    },

    end: function() {
        this.ended = true;
        this.emitter.emit('end');
        this.deferred.resolve();
    },

    error: function(e) {
        this.ended = true;
        this.deferred.reject(e);
    }
};

function walk(options) {
    var walker = new Walker(options);
    var _this = this;

    if (options.optimizerManifest) {
        return promises.resolved(options.optimizerManifest)
            .then(function(manifest) {
                manifest.forEachDependency(
                    function(type, packageDependency) {
                        walker.addDependency(packageDependency);
                    },
                    _this,
                    {
                        enabledExtensions: walker.enabledExtensions
                    });
                return walker.start();
            });
    }
    else if (options.dependency) {
        walker.addDependency(options.dependency);
        return walker.start();
    }
    else if (options.dependencies) {
        options.dependencies.forEach(function(d) {
            walker.addDependency(d);
        });
        return walker.start();
    }
    else {
        throw new Error('"optimizerManifest", "dependency", "dependencies" is required');
    }
}

exports.walk = walk;