const promisify = require('pify');

var nodePath = require('path');

var urlReader = require('../util/url-reader');
var urlRegExp = /^(http:|https:)?\/\//;

var fs = require('fs');

const readFileAsync = promisify(fs.readFile);

function maskDefine(code) {
    return '(function(define) { /* mask define */ ' + code + '\n}()); // END: mask define wrapper';
}

module.exports = {
    properties: {
        'path': 'string',
        'dir': 'string',
        'virtualPath': 'string',
        'url': 'string',
        'code': 'string',
        'external': 'boolean',
        'mask-define': 'boolean'
    },

    async init (lassoContext) {
        var path = this.path;

        if (!this.path && !this.url && !this.code && !this.virtualPath) {
            throw new Error('"path", "virtualPath", "url" or "code" is required for a resource dependency');
        }

        if (urlRegExp.test(path)) {
            this.url = path;
            path = null;
            delete this.path;
        }

        if (path) {
            this.path = this.resolvePath(path);
            this._dir = nodePath.dirname(this.path);
        }
    },

    cacheConfig: {
        cacheable: true,
        static: true
    },

    getDir: function() {
        return this._dir || this.dir;
    },

    async read (context) {
        if (this.code) {
            return this.code;
        }

        // if mask-define, use callback to wrap the resource
        if (this['mask-define'] === true) {
            const code = await readFileAsync(this.path, {encoding: 'utf8'});
            return maskDefine(code);
        // otherwise return a stream
        } else {
            if (this.url) {
                return urlReader.createUrlReadStream(this.url);
            } else {
                return fs.createReadStream(this.path, {encoding: 'utf8'});
            }
        }
    },

    isExternalResource: function() {
        return this.url != null && this.external !== false;
    },

    getUrl: function() {
        if (this.external !== false) {
            return this.url;
        }
    },

    getSourceFile: function() {
        return this.path || this.virtualPath;
    },

    async getLastModified (lassoContext) {
        if (!this.path) {
            return -1;
        }

        return this.getFileLastModified(this.path);
    }
};
