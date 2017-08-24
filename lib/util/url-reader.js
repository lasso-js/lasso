var http = require('http');
var https = require('https');
var DeferredReadable = require('./DeferredReadable');
var nodeUrl = require('url');

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
    }, {
        encoding: 'utf8'
    });

    return stream;
}

exports.createUrlReadStream = createUrlReadStream;
