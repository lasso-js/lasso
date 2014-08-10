var AsyncPackage = require('./AsyncPackage');
function LoaderMetadata(asyncGroups) {
    this._packageNames = Object.keys(asyncGroups);
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
        var names = this._packageNames;

        for (var i = 0, len = names.length; i < len; i++) {
            var name = names[i];
            var asyncPackage = this._asyncPackagesByName[names[i]];
            loaderMetadata[name] = asyncPackage ? asyncPackage.getMeta(context) : {};
        }

        return '$rloaderMeta=' + JSON.stringify(loaderMetadata) + ';';
    }
};

module.exports = LoaderMetadata;