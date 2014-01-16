var AsyncPackage = require('./AsyncPackage');
var raptorModulesTransport = require('raptor-modules/transport');
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

    addBundle: function(asyncPathInfo, bundle) {
        var pathInfo = raptorModulesTransport.getPathInfo(asyncPathInfo.path, {removeExt: false});
        
        var realPath = pathInfo.realPath;
        var asyncPackage = this._asyncPackagesByName[realPath] || (this._asyncPackagesByName[realPath] = new AsyncPackage(realPath));
        asyncPackage.addBundle(bundle);
        if (asyncPathInfo.alias) {
            var aliasFromPathInfo = raptorModulesTransport.getPathInfo(asyncPathInfo.aliasFrom);
            asyncPackage.addAlias(asyncPathInfo.alias, aliasFromPathInfo.logicalPath);
        }
    },

    readCode: function() {
        /*
        $rloaderMeta={
            "/foo@1.0.0/test/optimizer.json": {
                aliases: ["foo/test@/src/ui-components/buttons/SimpleButton"]
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