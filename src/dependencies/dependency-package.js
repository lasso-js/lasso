const ok = require('assert').ok;
const manifestLoader = require('../manifest-loader');
const nodePath = require('path');

module.exports = {
    properties: {
        path: 'string',
        from: 'string'
    },

    async init (lassoContext) {
        this._alias = this.path; // Store a reference to the unresolved path

        const from = this.from || this.getParentManifestDir();
        delete this.from;

        try {
            this._packageManifest = this.createPackageManifest(
                manifestLoader.load(
                    this.path,
                    from));
        } catch (e) {
            if (e.fileNotFound) {
                const inFile = this.getParentManifestPath();
                throw new Error('Lasso manifest not found for path "' + this.path + '" referenced in "' + (inFile || this.getParentManifestDir()) + '"');
            } else {
                throw new Error('Unable to load lasso manifest for path "' + this.path + '". Dependency: ' + this.toString() + '. Exception: ' + (e.stack || e));
            }
        }

        this.path = this._packageManifest.filename; // Store the resolved path and use that as the key
        ok(this.path, 'this.path should not be null');

        this._dir = nodePath.dirname(this.path);
    },

    getDir: function() {
        return this._dir;
    },

    async loadPackageManifest (lassoContext) {
        return this._packageManifest;
    },

    calculateKey () {
        return 'package|' + this.path;
    }
};
