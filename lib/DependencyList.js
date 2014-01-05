var Dependency = require('./dependencies/Dependency');

function DependencyList(dependencies, dirname, filename) {
    if (typeof dependencies === 'string') {
        filename = arguments[1];
        dirname = arguments[0];
        dependencies = [];
    }

    
    if (!dirname) {
        throw new Error('"dirname" is required');
    }

    // if (!filename) {
    //     throw new Error('"filename" is a required argument');
    // }

    if (dependencies && typeof dependencies === 'string') {
        throw new Error('invalid dependencies: ' + dependencies);
    }

    if (dependencies && dependencies.__DependencyList)  {
        dependencies = dependencies._dependencies;
    }

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

        var dependenciesModule = require('./dependencies');

        for (var i=0, len=this._dependencies.length; i<len; i++) {
            var d = this._dependencies[i];
            if (!Dependency.isDependency(d)) {
                // Lazily convert dependency objects to be
                // instance of Dependency classes
                this._dependencies[i] = d = dependenciesModule.createDependency(d, this._dirname, this._filename);
            }
        }

        this._converted = true;
    },

    addDependency: function(config) {
        if (this._converted) {
            var dependenciesModule = require('./dependencies');
            config = dependenciesModule.createDependency(config, this._dirname, this._filename);
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