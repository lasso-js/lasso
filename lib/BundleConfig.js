var DependencyList = require('./DependencyList');

var BundleConfig = function(dirname, filename) {
    if (!dirname) {
        throw new Error('"dirname" is required');
    }

    this.name = null;
    this.checksumsEnabled = undefined;
    this.dependencies = new DependencyList(dirname, filename);
    this.enabled = true;
    this.wrappers = undefined;
};

BundleConfig.prototype = {
    addDependency: function(dependency) {
        this.dependencies.push(dependency);
    },
    addDependencies: function(dependencies) {
        dependencies.forEach(this.addDependency, this);
    },
    forEachDependency: function(callback, thisObj) {
        this.dependencies.forEach(callback, thisObj);
    },
    toString: function() {
        return "[BundleConfig name=" + this.name + ", dependencies=[" + this.dependencies.toString() + "]]";
    },
    enableWrapper: function(wrapperId) {
        if (!this.wrappers) {
            this.wrappers = {};
        }
        this.wrappers[wrapperId] = true;
    },
    disableWrapper: function(wrapperId) {
        if (!this.wrappers) {
            this.wrappers = {};
        }
        this.wrappers[wrapperId] = false;
    }
};

module.exports = BundleConfig;