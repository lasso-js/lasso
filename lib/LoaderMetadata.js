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

        var code = '(function(loaderMeta) {\n';
        
        for (var name in this._packageNames) {
            if (this._packageNames.hasOwnProperty(name)) {
                var asyncPackage = this._asyncPackagesByName[name];
                code += 'loaderMeta[' + JSON.stringify(name) + '] = ';

                if (asyncPackage) {
                    code += JSON.stringify(asyncPackage.getMeta(context)) + ';\n';
                } else {
                    code += '{};\n';
                }
            }
        }

        code += '})(window.$rloaderMeta || (window.$rloaderMeta = {}));';

        return code;
    }
};

module.exports = LoaderMetadata;