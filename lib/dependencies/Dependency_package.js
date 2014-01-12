var manifestLoader = require('../manifest-loader');
var nodePath = require('path');

module.exports = {
    properties: {
        path: 'string',
        async: 'string'
    },

    init: function() {
        this._alias = this.path; // Store a reference to the unresolved path
        var manifest = this.getManifest();
        this.path = manifest.filename; // Store the resolved path and use that as the key
        this._dir = nodePath.dirname(this.path);
    },
    
    getDir: function() {
        return this._dir;
    },

    getAsyncPathInfo: function() {
        return {
            path: this.path,
            alias: this._alias
        };
    },

    loadManifest: function() {
        try {
            return manifestLoader.load(
                this.path, 
                this.getParentManifestDir());
        }
        catch(e) {
            if (e.fileNotFound) {
                throw new Error('Optimizer manifest not found for path "' + this.path + '" (searching from "' + this.getParentManifestDir() + '"). Dependency: ' + this.toString());
            }
            else {
                throw new Error('Unable to load optimizer manifest for path "' + this.path + '". Dependency: ' + this.toString() + '. Exception: ' + (e.stack || e));
            }
        }
    },
    
    manifestDependency: true
};