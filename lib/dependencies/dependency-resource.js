var nodePath = require('path');

var urlReader = require('../util/url-reader');
var urlRegExp = /^(http:|https:)?\/\//;

var fs = require('fs');


function maskDefine(code) {
    return '(function(define) { /* mask define */ ' + code + '\n}()); // END: mask define wrapper';
}

module.exports = {
    properties: {
        'path': 'string',
        'url': 'string',
        'code': 'string',
        'external': 'boolean',
        'mask-define': 'boolean'
    },

    init: function(lassoContext) {
        var path = this.path;

        if (!this.path && !this.url) {
            throw new Error('"path" is required for a resource dependency');
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
        return this._dir;
    },

    read: function(context, callback) {
        if (this.code){
            return this.code;
        }

        // if mask-define, use callback to wrap the resource
        if (this['mask-define'] === true) {
            fs.readFile(this.path, {encoding: 'utf8'}, function (err, code) {
                if (err) {
                    return callback(err);
                }
                callback(null, maskDefine(code));
            });
            return;

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
        return this.path;
    },

    getLastModified: function(lassoContext, callback) {
        if (!this.path) {
            return callback(null, -1);
        }

        this.getFileLastModified(this.path, callback);
    }
};
