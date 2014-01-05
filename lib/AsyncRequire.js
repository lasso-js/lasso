function AsyncRequire(name) {
    this.name = name;
    this.requires = [];
    this.requiresByName = {};
    this.bundles = [];
    this.bundlesByKey = {};
}

AsyncRequire.prototype = {
    getName: function() {
        return this.name;
    },
    
    addRequire: function(name) {
        if (!this.requiresByName[name]) {
            this.requiresByName[name] = true;
            this.requires.push(name);
        }
    },
    addBundle: function(bundle) {
        var bundleKey = bundle.getKey();
        
        if (!this.bundlesByKey[bundleKey]) {
            this.bundlesByKey[bundleKey] = true;
            this.bundles.push(bundle);
        }
    },
    getBundles: function() {
        return this.bundles;
    },
    
    hasRequires: function() {
        return this.requires.length > 0;
    },
    
    getRequires: function() {
        return this.requires;
    },
    forEachBundle: function(callback, thisObj) {
        this.bundles.forEach(callback, thisObj);
    },
    forEachRequire: function(callback, thisObj) {
        this.requires.forEach(callback, thisObj);
    }
};

module.exports = AsyncRequire;