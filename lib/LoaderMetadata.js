var AsyncPackage = require('./AsyncPackage');
function LoaderMetadata() {
    this._packageNames = {};
    this._asyncPackagesByName = {};
    this._aliasesByTarget = {};
}

LoaderMetadata.prototype = {

    addAsyncPackageName: function(asyncName) {
        this._packageNames[asyncName] = true;
    },

    addBundle: function(asyncName, bundle) {
        var asyncPackage = this._asyncPackagesByName[asyncName] || (this._asyncPackagesByName[asyncName] = new AsyncPackage(asyncName));
        asyncPackage.addBundle(bundle);
    },

    getCode: function(context) {

        if (!context) {
            throw new Error('"context" is required');
        }

        /*
        $rloaderMeta={
            "foo": {
                js: ['a.js'],
                css: ['b.js']
            }
        });
        */
        
        
        var loaderMetadata = {};
        
        for (var name in this._packageNames) {
            if (this._packageNames.hasOwnProperty(name)) {
                var asyncPackage = this._asyncPackagesByName[name];
                loaderMetadata[name] = asyncPackage ? asyncPackage.getMeta(context) : {};
            }
        }

        return '$rloaderMeta=' + JSON.stringify(loaderMetadata) + ';';
    }
};

module.exports = LoaderMetadata;