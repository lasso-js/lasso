var manifestLoader = require('../manifest-loader');

module.exports = {
    properties: {
        path: 'string'
    },

    init: function() {
        this._path = this.path;
        var manifest = this.getManifest();
        this.path = manifest.filename;
    },

    loadManifest: function() {
        try {
            return manifestLoader.load(
                this.path, 
                this.getManifestDir());
        }
        catch(e) {
            if (e.fileNotFound) {
                throw new Error('Optimizer manifest not found for path "' + this.path + '" (searching from "' + this.getManifestDir() + '"). Dependency: ' + this.toString());
            }
            else {
                throw new Error('Unable to load optimizer manifest for path "' + this.path + '". Dependency: ' + this.toString() + '. Exception: ' + (e.stack || e));
            }
        }
    },
    
    isManifestDependency: function() {
        return true;
    }
};