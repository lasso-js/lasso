var ok = require('assert').ok;
var DependencyList = require('./DependencyList');

var BundleConfig = function(dirname, filename) {
    ok(dirname, '"dirname" is required');
    ok(typeof dirname === 'string', '"dirname" is required');
    
    this.name = null;
    this.fingerprintsEnabled = undefined;
    this.dependencies = [];
    this.dirname = dirname;
    this.filename = filename;
    this.enabled = true;
    this.wrappers = undefined;
};

BundleConfig.prototype = {
    getDependencies: function(dependencyRegistry) {
        return new DependencyList(this.dependencies, dependencyRegistry, this.dirname, this.filename);
    },
    addDependency: function(dependency) {
        this.dependencies.push(dependency);
    },
    addDependencies: function(dependencies) {
        dependencies.forEach(this.addDependency, this);
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