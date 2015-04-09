var dependencyWalker = require('../dependency-walker');
var parallel = require('raptor-async/parallel');
var DependencyList = require('../DependencyList');

var thresholdRegex = /^(\d+)([%]*)$/;

module.exports = {
    properties: {
        dependencies: 'array',
        threshold: 'object'
    },

    init: function(lassoContext, callback) {
        if (!this.dependencies) {
            return callback(new Error('"dependencies" property is required'));
        }

        if (!Array.isArray(this.dependencies)) {
            return callback(new Error('"dependencies" property is required'));
        }

        this.dependencies = new DependencyList(
            this.dependencies,
            lassoContext.dependencyRegistry,
            this.getParentManifestDir(),
            this.getParentManifestPath());

        if (this.threshold) {
            if (typeof this.threshold === 'string') {
                var match = thresholdRegex.exec(this.threshold);
                var units;

                if (!match || ((units = match[2]) && (units !== '%'))) {
                    return callback(new Error('Invalid threshold: ' + this.threshold));
                }

                this.threshold = {
                    value: parseInt(match[1], 10),
                    units: units
                };
            } else {
                this.threshold = {
                    value: this.threshold
                };
            }
        }

        callback();
    },

    getDir: function() {
        return null;
    },

    getDependencies: function(lassoContext, callback) {
        var self = this;
        var tracking = {};
        var flags = lassoContext.flags;
        var firstSet = [];

        this.dependencies.normalize(function(err, dependencies) {
            if (err) {
                return callback(err);
            }

            var numDependencies = dependencies.length;
            var thresholdValue;
            if (self.threshold) {
                thresholdValue = self.threshold.value;
                if (self.threshold.units === '%') {
                    // A dependency will become part of the intersection if it is in at X percent of the enumerated list of dependencies
                    thresholdValue = thresholdValue / 100 * numDependencies;
                } else {
                    // A dependency will become part of the intersection if it is in at least X of the enumerated list of dependencies
                    thresholdValue = self.threshold.value;
                }
            } else {
                // strict intersection -- only include the dependencies that are in the enumerated list of dependencies
                thresholdValue = numDependencies;
            }

            var strictIntersection = (thresholdValue >= numDependencies);

            var asyncTasks = dependencies.map(function(dependency, i) {
                return function(callback) {
                    dependencyWalker.walk({
                            lassoContext: lassoContext,
                            dependency: dependency,
                            flags: flags,
                            on: {
                                dependency: function(dependency, context) {
                                    if (!dependency.isPackageDependency()) {
                                        var info = tracking[dependency.getKey()];
                                        if (info === undefined) {
                                            tracking[dependency.getKey()] = {
                                                dependency: dependency,
                                                count: 1
                                            };
                                        } else {
                                            info.count++;
                                        }

                                        if ((i === 0) && strictIntersection) {
                                            // strict intersection so only need to keep track
                                            // dependencies from first set (which is a little
                                            // arbitrary but will work)
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

                function checkDependency(info) {
                    if (info.count >= thresholdValue) {
                        intersection.push(info.dependency);
                    }
                }

                if (strictIntersection) {
                    // strict intersection
                    for (var i=0,len=firstSet.length; i<len; i++) {
                        var dependency = firstSet[i];
                        checkDependency(tracking[dependency.getKey()]);
                    }
                } else {
                    // not a strict intersection so we need to check counts for all dependencies
                    for (var key in tracking) {
                        if (tracking.hasOwnProperty(key)) {
                            checkDependency(tracking[key]);
                        }
                    }
                }

                callback(null, intersection);
            });
        });
    }
};
