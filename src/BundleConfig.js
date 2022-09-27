const ok = require('assert').ok;
const DependencyList = require('./DependencyList');

const BundleConfig = function(dirname, filename) {
    ok(dirname, '"dirname" is required');
    ok(typeof dirname === 'string', '"dirname" is required');

    this.name = null;
    this.fingerprintsEnabled = undefined;
    this.dependencies = [];
    this.dirname = dirname;
    this.filename = filename;
    this.enabled = true;
};

BundleConfig.prototype = {
    getRecurseInto: function() {
        // recurseInto is set by config-loader.js
        return this.recurseInto;
    },

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
        return '[BundleConfig name=' + this.name + ', dependencies=[' + this.dependencies.toString() + ']]';
    }
};

module.exports = BundleConfig;
