var AsyncPackage = require('./AsyncPackage');
function LoaderMetadata() {
    this._packageNames = Object.create(null);
    this._asyncPackagesByName = {};
}

LoaderMetadata.prototype = {

    addAsyncPackageName: function(asyncName) {
        this._packageNames[asyncName] = true;
    },

    addBundle: function(asyncName, bundle) {
        var asyncPackage = this._asyncPackagesByName[asyncName] || (this._asyncPackagesByName[asyncName] = new AsyncPackage(asyncName));
        asyncPackage.addBundle(bundle);
    },

    /**
     * This method is used by lasso-modules-client/transport/src/code-loader-metadata.js
     * to create simple object that can be stringified to generate code for
     * lasso metadata.
     */
    toObject: function(context) {
        if (!context) {
            throw new Error('"context" is required');
        }

        // EXAMPLE RESULT:
        /*
        {
            "foo": {
                js: ['a.js'],
                css: ['b.js']
            }
        }
        */
        var result = {};

        for (var name in this._packageNames) {
            var asyncPackage = this._asyncPackagesByName[name];
            if (asyncPackage) {
                result[name] = asyncPackage.getMeta(context);
            } else {
                result[name] = {};
            }
        }

        return result;
    }
};

module.exports = LoaderMetadata;
