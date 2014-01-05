var forEachEntry = require('raptor-util').forEachEntry;

/**
 *
 */
var PageBundles = function() {
    
    this.bundleLookup = {};
    this.asyncBundleLookup = {};
    this.bundlesBySlot = {};
    this.bundleCount = 0;
    this.asyncRequiresByName = {};
};

PageBundles.prototype = {
    addBundleToSlot: function(bundle) {
        /*
         * Add the bundle to a page slot if it has not already been added
         */
        var bundleLookupKey = bundle.getKey();
        
        if (!this.bundleLookup[bundleLookupKey]) {
            this.bundleLookup[bundleLookupKey] = bundle;
            
            this.bundleCount++;
            
            var bundlesForSlot = this.bundlesBySlot[bundle.getSlot()];
            if (!bundlesForSlot) {
                bundlesForSlot = this.bundlesBySlot[bundle.getSlot()] = {
                   css: [],
                   js: []
                };
            }
            
            if (bundle.isJavaScript()) {
                bundlesForSlot.js.push(bundle);
            }
            else if (bundle.isStyleSheet()){
                bundlesForSlot.css.push(bundle);
            }
            else {
                throw new Error("Invalid content for bundle: " + bundle.getContentType());
            }
        }
    },

    addAsyncBundle: function(bundle) {
        this.asyncBundleLookup[bundle.getKey()] = bundle;
    },

    lookupBundle: function(bundle) {
        return this.bundleLookup[bundle.getKey()];
    },
    
    forEachBundle: function(callback, thisObj) {
        forEachEntry(this.bundleLookup, function(bundleKey, bundle) {
            callback.call(thisObj, bundle);
        }, this);
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
    },
    
    getBundleCount: function() {
        return this.bundleCount;
    }
};

module.exports = PageBundles;