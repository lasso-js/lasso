var thenFS = require('then-fs');

module.exports = {
    properties: {
        'path': 'string',
        'url': 'string',
        'code': 'string'
    },

    init: function() {
        if (this.path) {
            this._path = this.path; // Keep the original unresolved path around
            this.path = this.resolvePath(this._path);    
        }
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
        return thenFS.stat(this.path).then(function(stat) {
            return stat.mtime;
        });
    }
};