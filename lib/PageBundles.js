var forEachEntry = require('raptor-util').forEachEntry;

/**
 *
 */
var PageBundles = function() {
    this.bundles = [];
    this.bundleLookup = {};
    this.asyncBundleLookup = {};
};

PageBundles.prototype = {
    addSyncBundle: function(bundle) {
        /*
         * Add the bundle to a page slot if it has not already been added
         */
        var bundleLookupKey = bundle.getKey();

        if (!this.bundleLookup[bundleLookupKey]) {
            this.bundleLookup[bundleLookupKey] = bundle;
            this.bundles.push(bundle);
        }
    },

    addAsyncBundle: function(bundle) {
        this.asyncBundleLookup[bundle.getKey()] = bundle;
    },

    lookupSyncBundle: function(bundle) {
        return this.bundleLookup[bundle.getKey()];
    },

    forEachBundle: function(callback, thisObj) {
        this.bundles.forEach(callback, thisObj);
    },

    forEachAsyncBundle: function(callback, thisObj) {
        forEachEntry(this.asyncBundleLookup, function(bundleKey, bundle) {
            callback.call(thisObj, bundle);
        }, this);
    },

    forEachBundleIter: function() {
        return this.forEachBundle.bind(this);
    },

    forEachAsyncBundleIter: function() {
        return this.forEachAsyncBundle.bind(this);
    }
};

module.exports = PageBundles;