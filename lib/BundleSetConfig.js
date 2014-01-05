var nextId = 0;
        
function BundleSetConfig(name) {
    this._id = nextId++;
    this.name = name;
    this.bundleConfigs = [];
}

BundleSetConfig.prototype = {
    addBundleConfig: function(bundleConfig) {
        this.bundleConfigs.push(bundleConfig);
    },
    forEachBundleConfig: function(callback, thisObj) {
        this.bundleConfigs.forEach(callback, thisObj);
    }
};

module.exports = BundleSetConfig;