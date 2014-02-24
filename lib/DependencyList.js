var dependenciesModule = require('./dependencies');
var ok = require('assert').ok;

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
    
    this.dependencyRegistry = dependencyRegistry;
    this._dependencies = dependencies || [];
    
    this._dirname = dirname;
    this._filename = filename;
    this._converted = false;
}

DependencyList.prototype = {
    __DependencyList: true,

    _convertDependencies: function() {
        if (this._converted) {
            return;
        }

        for (var i=0, len=this._dependencies.length; i<len; i++) {
            var d = this._dependencies[i];
            if (!dependenciesModule.isDependency(d)) {
                // Lazily convert dependency objects to be
                // instance of Dependency classes
                this._dependencies[i] = d = this.dependencyRegistry.createDependency(d, this._dirname, this._filename);
            }
        }

        this._converted = true;
    },

    addDependency: function(config) {
        if (this._converted) {
            config = this.dependencyRegistry.createDependency(config, this._dirname, this._filename);
        }

        this._dependencies.push(config);
    },

    forEach: function(callback, thisObj) {
        this._convertDependencies();

        for (var i=0, len=this._dependencies.length; i<len; i++) {
            callback.call(thisObj, this._dependencies[i], i);
        }
    },

    get: function(i) {
        this._convertDependencies();

        return this._dependencies[i];
    },

    get length() {
        return this._dependencies.length;
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