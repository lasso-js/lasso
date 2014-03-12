function AsyncPackage(name) {
    this.name = name;
    this.bundles = [];
    this.bundlesByKey = {};
}

AsyncPackage.prototype = {
    getName: function() {
        return this.name;
    },

    addBundle: function(bundle) {
        var bundleKey = bundle.getKey();
        
        if (!this.bundlesByKey[bundleKey]) {
            this.bundlesByKey[bundleKey] = true;
            this.bundles.push(bundle);
        }
    },

    getMeta: function(context) {
        var meta = {
            css: [],
            js: []
        };



        var bundles = this.bundles;

        for (var i=0, len=bundles.length; i<len; i++) {
            var bundle = bundles[i];
            if (bundle.isJavaScript()) {
                meta.js.push(bundle.getUrl(context));
            }
            else if (bundle.isStyleSheet()) {
                meta.css.push(bundle.getUrl(context));
            }
            else {
                throw new Error("Invalid bundle content type: " + bundle.getContentType());
            }
        }

        if (!meta.js.length) {
            delete meta.js;
        }
        
        if (!meta.css.length) {
            delete meta.css;
        }

        return meta;
    }
};

module.exports = AsyncPackage;