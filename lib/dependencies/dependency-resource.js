var nodePath = require('path');

var urlRegExp = /^(http:|https:)?\/\//;
var http = require('http');
var https = require('https');
var DeferredReadable = require('../util/DeferredReadable');
var nodeUrl = require('url');
var fs = require('fs');

function createUrlReadStream(url) {
    var stream = new DeferredReadable(function() {
        var parsedUrl = nodeUrl.parse(url);
        var isSecure = parsedUrl.protocol === 'https:';
        var get = isSecure ? https.get : http.get;

        var options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isSecure ? 443 : 80),
            path: parsedUrl.pathname + (parsedUrl.search ? parsedUrl.search : '')
        };

        var req = get(options, function(res) {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                stream.emit('error', 'Request to ' + url + ' failed with a HTTP status code ' + res.statusCode);
                return;
            }

            res
                .on('end', function() {
                    stream.push(null);
                })
                .on('error', function(err) {
                    stream.emit('error', err);
                })
                .on('data', function(data) {
                    stream.push(data);
                });
        });

        req.on('error', function(err) {
            stream.emit('error', 'Request to ' + url + ' failed. Error: ' + (err.stack || err));
        });

    }, { encoding: 'utf8' });

    return stream;
}

module.exports = {
    properties: {
        'path': 'string',
        'url': 'string',
        'code': 'string',
        'external': 'boolean'
    },

    init: function(lassoContext, callback) {


        var path = this.path;

        if (!this.path && !this.url) {
            return callback(new Error('"path" is required for a resource dependency'));
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
        callback();
    },


    cacheConfig: {
        cacheable: true,
        static: true
    },

    getDir: function() {
        return this._dir;
    },

    read: function(context) {
        if (this.code){
            return this.code;
        }

        if (this.url) {
            return createUrlReadStream(this.url);
        } else {
            return fs.createReadStream(this.path, {encoding: 'utf8'});
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
