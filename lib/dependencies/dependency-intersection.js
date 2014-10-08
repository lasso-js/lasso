var dependencyWalker = require('../dependency-walker');
var parallel = require('raptor-async/parallel');
var DependencyList = require('../DependencyList');

module.exports = {
    properties: {
        dependencies: 'array'
    },

    init: function(optimizerContext, callback) {
        if (!this.dependencies) {
            return callback(new Error('"dependencies" property is required'));
        }

        if (!Array.isArray(this.dependencies)) {
            return callback(new Error('"dependencies" property is required'));
        }

        this.dependencies = new DependencyList(
            this.dependencies || [],
            optimizerContext.dependencyRegistry,
            this.getParentManifestDir(),
            this.getParentManifestPath());

        callback();
    },

    getDir: function() {
        return null;
    },

    getDependencies: function(optimizerContext, callback) {
        var counts = {};
        var enabledExtensions = optimizerContext.enabledExtensions;
        var firstSet = [];

        this.dependencies.normalize(function(err, dependencies) {
            if (err) {
                return callback(err);
            }

            var setCount = dependencies.length;

            var asyncTasks = dependencies.map(function(dependency, i) {
                return function(callback) {
                    dependencyWalker.walk({
                            optimizerContext: optimizerContext,
                            dependency: dependency,
                            enabledExtensions: enabledExtensions,
                            on: {
                                dependency: function(dependency, context) {
                                    if (!dependency.isPackageDependency()) {
                                        var count = counts[dependency.getKey()];
                                        if (count == null) {
                                            counts[dependency.getKey()] = 1;
                                        } else {
                                            counts[dependency.getKey()]++;
                                        }

                                        if (i === 0) {
                                            firstSet.push(dependency);
                                        }
                                    }
                                }
                            }
                        }, callback);
                };
            });
            parallel(asyncTasks, function(err) {
                if (err) {
                    return callback(err);
                }

                var intersection = [];

                for (var i=0,len=firstSet.length; i<len; i++) {
                    var dependency = firstSet[i];
                    if (counts[dependency.getKey()] === setCount) {
                        // The dependency was found in every set if the count
                        // matches the number of sets
                        intersection.push(dependency);
                    }
                }

                callback(null, intersection);
            });
        });
    }
};
