const http = require('http');
const https = require('https');
const DeferredReadable = require('./DeferredReadable');

function createUrlReadStream(url) {
    const stream = new DeferredReadable(function() {
        const parsedUrl = new URL(url, 'file:');
        const isSecure = parsedUrl.protocol === 'https:';
        const get = isSecure ? https.get : http.get;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isSecure ? 443 : 80),
            path: parsedUrl.pathname + (parsedUrl.search ? parsedUrl.search : '')
        };

        const req = get(options, function(res) {
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
