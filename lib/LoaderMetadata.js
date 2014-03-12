var AsyncPackage = require('./AsyncPackage');
var resumer = require('resumer');

function LoaderMetadata(context) {
    if (!context) {
        throw new Error('"context" is required');
    }
    this.context = context;
    this._asyncPackagesByName = {};
    this._aliasesByTarget = {};
}

LoaderMetadata.prototype = {

    addBundle: function(asyncName, bundle) {
        var asyncPackage = this._asyncPackagesByName[asyncName] || (this._asyncPackagesByName[asyncName] = new AsyncPackage(asyncName));
        asyncPackage.addBundle(bundle);
    },

    readCode: function() {
        /*
        $rloaderMeta={
            "foo": {
                js: ['a.js'],
                css: ['b.js']
            }
        });
        */
        
        var context = this.context;
        var loaderMetadata = {};
        for (var k in this._asyncPackagesByName) {
            if (this._asyncPackagesByName.hasOwnProperty(k)) {
                var asyncPackage = this._asyncPackagesByName[k];
                loaderMetadata[asyncPackage.getName()] = asyncPackage.getMeta(context);
            }
        }

        return resumer()
            .queue('$rloaderMeta=')
            .queue(JSON.stringify(loaderMetadata))
            .queue(';')
            .end();
    }
};

module.exports = LoaderMetadata;