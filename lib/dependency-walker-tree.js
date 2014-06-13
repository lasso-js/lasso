var promises = require('raptor-promises');
var EventEmitter = require('events').EventEmitter;
var async = require('async');
var forEachEntry = require('raptor-util').forEachEntry;
// var logger = require('raptor-logging').logger(module);


function Node() {
    this.children = [];
}

Node.prototype = {
    addChild: function(child) {

    },
    __node: true,
    _toString: function(out, indent, found) {
        out.push(indent);
        if (this.isRoot) {
            out.push('ROOT\n');
        } else if (this.manifest) {
            out.push('manifest: ' + (this.dependency ? this.dependency.toString() : 'Root manifest') + '\n');
        }

        for (var i=0; i<this.children.length; i++) {
            var child  = this.children[i];
            if (!child) {
                out.push(indent + '  ' + 'NULL CHILD!');
            } else if (child.__node) {
                if (child.dependency) {
                    if (found[child.dependency.getKey()]) {
                        out.push(indent + '  (cycle)');
                        continue;
                    }

                    found[child.dependency.getKey()] = true;
                }
                
                child._toString(out, indent + '  ', found);
            } else {
                out.push(indent + '  ' + 'dependency: ' + child + '\n');
            }
        }
    },
    toString: function() {
        var indent = '';
        var out = [];
        var found = {};
        this._toString(out, indent, found);
        return out.join('');
    }

};

function buildTree(options, callback) {
    var context = options.context || {};
    var enabledExtensions = options.enabledExtensions;
    // var startTime = Date.now();
    var hadError = false;

    function handleError(err) {
        if (hadError) {
            return;
        }

        hadError = true;
        
        queue.kill();
        callback(err);
    }

    var queue = async.queue(function (task, taskCallback) {
        task(function(err) {
            if (err) {
                return handleError(err);
            }
            
            taskCallback();
        });
    }, 5);

    queue.drain = function() {
        if (hadError) {
            return;
        }

        // console.log('Tree built in ' + (Date.now() - startTime) + 'ms');
        callback(null, root);
    };

    var root = new Node();
    root.isRoot = true;

    var packageNodes = {};


    
    function calculateDependencyKey(dependency, callback) {
        var key = dependency.getKey();

        if (key) {
            return callback(null, key);
        }

        queue.push(function(_callback) {
            return dependency.calculateKey(context)
                .then(function() {
                    key = dependency.getKey();

                    if (callback) {
                        callback(null, key);
                    }
                    _callback();
                })
                .catch(function(err) {
                    if (callback) {
                        callback(err);
                    }
                    _callback(err);
                });
        });
    }

    function handleManifest(manifest, parentNode) {
        // console.log('handleManifest: ', manifest.filename);

        manifest.forEachDependency({
            enabledExtensions: enabledExtensions,
            context: options.context,
            callback: function(type, d) {
                handleDependency(d, parentNode);
            }
        });
    }

    function loadPackageManifest(dependency, parentNode, pos) {

        calculateDependencyKey(dependency, function(err, key) {
            if (err) {
                return handleError(err);
            }

            var node = packageNodes[key];
            if (node) {
                parentNode.children[pos] = node;
                return;
            }

            packageNodes[key] = parentNode.children[pos] = node = new Node();
            node.dependency = dependency;

            queue.push(function(callback) {
                dependency.getPackageManifest(context, function(err, manifest) {
                    if (err) {
                        return callback(err);
                    }

                    node.manifest = manifest;

                    handleManifest(manifest, node);
                    callback();
                });
            });
        });
    }

    function handleDependency(dependency, parentNode) {
        // console.log('handleDependency: ' + dependency);

        if (dependency.isPackageDependency()) {
            var pos = parentNode.children.length;
            parentNode.children.push(null); // Push a placeholder to hold the position
                                            // The actual node will be loaded later
            loadPackageManifest(dependency, parentNode, pos);
        } else {
            parentNode.children.push(dependency);
            calculateDependencyKey(dependency);
        }
    }

    if (options.optimizerManifest) {
        var node = new Node();
        node.manifest = options.optimizerManifest;
        root.children.push(node);
        handleManifest(options.optimizerManifest, node);
    } else if (options.dependency) {
        handleDependency(options.dependency, root);
    } else if (options.dependencies) {
        options.dependencies.forEach(function(d) {
            handleDependency(d, root);
        });
    } else {
        throw new Error('One of "optimizerManifest", "dependency" or "dependencies" is required');
    }

    if (queue.length() === 0) {
        callback(null, root);
    }
}



/**
 * Helper method to walk all dependencies recursively
 *
 * @param options
 */
function walk(options, callback) {
    var startTime = Date.now();
    var deferred = callback ? null : promises.defer();

    var emitter = new EventEmitter();
    var walkContext = {};
    var shouldSkipDependencyFunc = options.shouldSkipDependency;

    var on = options.on;
    if (!on) {
        throw new Error('"on" property is required');
    }

    forEachEntry(on, function(event, listener) {
        emitter.on(event, listener);
    });

    var foundDependencies = {};


    var hadError = false;

    function done(err) {
        if (hadError) {
            return;
        }

        if (err) {
            hadError = true;
            if (callback) {
                callback(err);
            } else {
                deferred.reject(err);
            }
        } else {
            console.log('Completed walk in ' + (Date.now() - startTime) + 'ms');
            emitter.emit('end');

            if (callback) {
                callback();
            } else {
                deferred.resolve();
            }
        }
    }

    function walkTree(node, parentDependency, jsSlot, cssSlot) {
        var dependency;

        if (node.__node) {
            dependency = node.dependency;
            if (dependency) {
                if (foundDependencies[dependency.getKey()]) {
                    return;
                }

                foundDependencies[dependency.getKey()] = true;

                if (shouldSkipDependencyFunc && shouldSkipDependencyFunc(dependency)) {
                    return;
                }

                jsSlot = node.dependency.getJavaScriptSlot() || jsSlot;
                cssSlot = node.dependency.getStyleSheetSlot() || cssSlot;
                emitter.emit('dependency', dependency, walkContext);
            }

            // This might be a root node or a package dependency node
            if (node.manifest) {
                emitter.emit('manifest', node.manifest);
            }

            var children = node.children;
            
            
            for (var i=0, len = children.length; i<len; i++) {
                walkTree(children[i], dependency, jsSlot, cssSlot);
            }
        } else {

            dependency = node;
            if (foundDependencies[dependency.getKey()]) {
                return;
            }

            foundDependencies[dependency.getKey()] = true;

            if (shouldSkipDependencyFunc && shouldSkipDependencyFunc(dependency)) {
                return;
            }

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
            walkContext.parentDependency = parentDependency;

            // console.log('DEPENDENCY: ', dependency.toString(), dependency.getKey());

            // This is a dependency object
            emitter.emit('dependency', dependency, walkContext);
        }
    }

    buildTree(options, function(err, root) {
        if (err) {
            return done(err);
        }

        // console.log('\n\nTREE:\n' + root.toString());

        walkTree(root);
        done();
    });

    return callback ? null : deferred.promise;
}

exports.walk = walk;