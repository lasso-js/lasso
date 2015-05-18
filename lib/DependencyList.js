var dependenciesModule = require('./dependencies');
var ok = require('assert').ok;
var AsyncValue = require('raptor-async/AsyncValue');

function DependencyList(dependencies, dependencyRegistry, dirname, filename) {
    ok(dirname && typeof dirname === 'string', '"dirname" argument should be a string');
    ok(!filename || typeof filename === 'string', '"filename" argument should be a string');
    ok(dependencyRegistry && dependenciesModule.isRegistry(dependencyRegistry), 'dependencyRegistry argument is not valid');

    if (dependencies) {
        if (dependencies.__DependencyList)  {
            dependencies = dependencies._dependencies;
        } else if (!Array.isArray(dependencies)) {
            throw new Error('Invalid dependencies: ' + dependencies);
        }
    }

    this._dependencyRegistry = dependencyRegistry;
    this._dependencies = dependencies || [];
    this._normalizeAsyncValue = null;

    this._dirname = dirname;
    this._filename = filename;
}

DependencyList.prototype = {
    __DependencyList: true,

    addDependency: function(config) {
        if (this._converted) {
            config = this.dependencyRegistry.createDependency(config, this._dirname, this._filename);
        }

        this._dependencies.push(config);
    },

    normalize: function(callback) {
        ok(typeof callback === 'function', 'callback function expected');

        if (!this._normalizeAsyncValue) {
            var normalizeAsyncValue = this._normalizeAsyncValue = new AsyncValue();

            this._dependencyRegistry.normalizeDependencies(
                this._dependencies,
                this._dirname,
                this._filename,
                function(err, dependencyArray) {
                    if (err) {
                        return normalizeAsyncValue.reject(err);
                    }

                    normalizeAsyncValue.resolve(dependencyArray);
                });
        }

        this._normalizeAsyncValue.done(callback);
    },

    toString: function() {
        return '[DependencyList: ' + this._dependencies.join(',') + ']';
    }
};

DependencyList.prototype.push = DependencyList.prototype.addDependency;

DependencyList.isDependencyList = function(o) {
    return o && o.__DependencyList;
};

module.exports = DependencyList;