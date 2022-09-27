const dependencyWalker = require('../dependency-walker');
const DependencyList = require('../DependencyList');

const thresholdRegex = /^(\d+)([%]*)$/;
const hasOwn = Object.prototype.hasOwnProperty;

function onDependency (tracking, strictIntersection, firstSet, i) {
    return function (dependency, context) {
        if (dependency.isPackageDependency()) {
            return;
        }

        const key = dependency.getKey();

        const info = tracking[key];
        if (info === undefined) {
            tracking[key] = {
                dependency,
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
    };
}

module.exports = {
    properties: {
        dependencies: 'array',
        threshold: 'object'
    },

    async init (lassoContext) {
        if (!this.dependencies) {
            throw new Error('"dependencies" property is required');
        }

        if (!Array.isArray(this.dependencies)) {
            throw new Error('"dependencies" property is required');
        }

        this.dependencies = new DependencyList(
            this.dependencies,
            lassoContext.dependencyRegistry,
            this.getParentManifestDir(),
            this.getParentManifestPath());

        if (this.threshold) {
            if (typeof this.threshold === 'string') {
                const match = thresholdRegex.exec(this.threshold);
                let units;

                if (!match || ((units = match[2]) && (units !== '%'))) {
                    throw new Error('Invalid threshold: ' + this.threshold);
                }

                this.threshold = {
                    value: parseInt(match[1], 10),
                    units
                };
            } else {
                this.threshold = {
                    value: this.threshold
                };
            }
        }
    },

    getDir: function() {
        return null;
    },

    async getDependencies (lassoContext) {
        const tracking = {};
        const flags = lassoContext.flags;
        const firstSet = [];

        const dependencies = await this.dependencies.normalize();

        const numDependencies = dependencies.length;
        let thresholdValue;
        if (this.threshold) {
            thresholdValue = this.threshold.value;
            if (this.threshold.units === '%') {
                // A dependency will become part of the intersection if it is in at X percent of the enumerated list of dependencies
                thresholdValue = thresholdValue / 100 * numDependencies;
            } else {
                // A dependency will become part of the intersection if it is in at least X of the enumerated list of dependencies
                thresholdValue = this.threshold.value;
            }
        } else {
            // strict intersection -- only include the dependencies that are in the enumerated list of dependencies
            thresholdValue = numDependencies;
        }

        const strictIntersection = (thresholdValue >= numDependencies);

        for (const [i, dependency] of dependencies.entries()) {
            // HACK: The built-in `dep-require` dependency type
            // uses its `Deduper` instance to ignore dependencies
            // within the same "phase" of a lasso operation.
            //
            // However, for the purposes of calculating intersection
            // we should not de-duplicate across each "walk" of
            // starting dependency.
            //
            // The `Deduper` stores a cache of "visited" dependencies in
            // `lassoContext.phaseData['dependency-require']`.
            //
            // We reset the `phaseData` property to remove this
            // cache before we walk each starting dependency.
            const oldPhaseData = lassoContext.phaseData;
            lassoContext.phaseData = {};

            await dependencyWalker.walk({
                lassoContext,
                dependency,
                flags,
                on: {
                    dependency: onDependency(tracking, strictIntersection, firstSet, i)
                }
            });

            lassoContext.phaseData = oldPhaseData;
        }

        const intersection = [];

        function checkDependency(info) {
            if (info.count >= thresholdValue) {
                intersection.push(info.dependency);
            }
        }

        if (strictIntersection) {
            // strict intersection
            for (let i = 0, len = firstSet.length; i < len; i++) {
                const dependency = firstSet[i];
                checkDependency(tracking[dependency.getKey()]);
            }
        } else {
            // not a strict intersection so we need to check counts for all dependencies
            for (const key in tracking) {
                if (hasOwn.call(tracking, key)) {
                    checkDependency(tracking[key]);
                }
            }
        }

        return intersection;
    },

    calculateKey () {
        return null; // A just use a unique ID for this dependency
    }
};
