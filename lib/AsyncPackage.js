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
            var url;
            if (!bundle.hasContent() || !(url = bundle.getUrl(context))) {
                // skip bundles without content or bundles that don't have a URL.
                // TODO: Figure out what to do with inline dependencies that belong to an async bundle
                //       These dependencies don't have a URL but code should still be included, right?
                continue;
            }
            if (bundle.isJavaScript()) {
                meta.js.push(url);
            } else if (bundle.isStyleSheet()) {
                meta.css.push(url);
            } else {
                throw new Error('Invalid bundle content type: ' + bundle.getContentType());
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