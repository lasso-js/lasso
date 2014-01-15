var thenFS = require('then-fs');
var nodePath = require('path');

module.exports = {
    properties: {
        'path': 'string',
        'url': 'string',
        'code': 'string'
    },

    init: function() {
        if (!this.path) {
            throw new Error('"path" is required for a resource dependency');
        }
        
        this._path = this.path; // Keep the original unresolved path around
        this.path = this.resolvePath(this._path);
        this._dir = nodePath.dirname(this.path);
    },
    
    getDir: function() {
        return this._dir;
    },

    read: function(context) {
        if (this.code){
            return this.code;
        }

        if (this.url) {
            return null;
        }

        return this.readResource(this.path);
    },

    isExternalResource: function() {
        return this.url != null;
    },

    getUrl: function() {
        return this.url;
    },

    getSourceFile: function() {
        return this.path;
    },

    lastModified: function() {
        return this.resourceLastModified(this.path);
    }
};