var AsyncPackage = require('./AsyncPackage');
function LoaderMetadata() {
    this._asyncPackagesByName = {};
    this._aliasesByTarget = {};
}

LoaderMetadata.prototype = {

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
        for (var k in this._asyncPackagesByName) {
            if (this._asyncPackagesByName.hasOwnProperty(k)) {
                var asyncPackage = this._asyncPackagesByName[k];
                loaderMetadata[asyncPackage.getName()] = asyncPackage.getMeta(context);
            }
        }

        return '$rloaderMeta=' + JSON.stringify(loaderMetadata) + ';';
    }
};

module.exports = LoaderMetadata;