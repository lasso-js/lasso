function PageConfig() {
    this.name = null;
    this.bundleSetConfig = null;
    this.packageManifest = null;
}

PageConfig.prototype = {

    getBundleSetConfig: function() {
        return this.bundleSetConfig;
    },

    addBundleSetConfig: function(bundleSetConfig) {
        if (this.bundleSetConfig) {
            throw new Error('Page "' + this.name + '" already has bundles defined"');
        }

        this.bundleSetConfig = bundleSetConfig;
    },

    setPackageManifest: function(packageManifest) {
        this.packageManifest = packageManifest;
    },

    getPackageManifest: function() {
        return this.packageManifest;
    },

    getName: function() {
        return this.name;
    },

    toString: function() {
        return "[PageConfig name=" + this.name + "]";
    }
};

module.exports = PageConfig;