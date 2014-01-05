var AsyncRequire = require('./AsyncRequire');

function LoaderMetadata(context) {
    if (!context) {
        throw new Error('"context" is required');
    }
    this.context = context;
    this._asyncRequiresByName = {};
    this._json = null;    
}

LoaderMetadata.prototype = {

    addBundle: function(name, bundle) {
        var asyncRequire = this._asyncRequiresByName[name] || (this._asyncRequiresByName[name] = new AsyncRequire(name));
        asyncRequire.addBundle(bundle);
    },

    _buildJSON: function() {
        var context = this.context;
        var loaderMetadata = {};

        for (var k in this._asyncRequiresByName) {
            if (this._asyncRequiresByName.hasOwnProperty(k)) {
                var asyncRequire = this._asyncRequiresByName[k];
                var entry = loaderMetadata[asyncRequire.getName()] = {
                    css: [],
                    js: []
                };

                var bundles = asyncRequire.getBundles();

                for (var i=0, len=bundles.length; i<len; i++) {
                    var bundle = bundles[i];
                    if (bundle.isJavaScript()) {
                        entry.js.push(bundle.getUrl(context));
                    }
                    else if (bundle.isStyleSheet()) {
                        entry.css.push(bundle.getUrl(context));
                    }
                    else {
                        throw new Error("Invalid bundle content type: " + bundle.getContentType());
                    }
                }

                if (!entry.js.length) {
                    delete entry.js;
                }
                
                if (!entry.css.length) {
                    delete entry.css;
                }
            }
        }

        return JSON.stringify(loaderMetadata);
    },

    toJSON: function() {
        if (!this._json) {
            this._json = this._buildJSON();
        }
        return this._json;
    }
};

module.exports = LoaderMetadata;