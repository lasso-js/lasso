var crypto = require('crypto');
var eventStream = require('event-stream');
var ok = require('assert').ok;

function pipe(input) {
    ok(input, '"input" is required');

    var shasum = crypto.createHash('sha1');

    var dest = eventStream.through(function write(data) {
            shasum.update(data);
            this.queue(data);
        },
        function end() {
            var checksum = shasum.digest('hex');
            this.emit('checksum', checksum);
            this.emit('end');
        });

    input.on('error', function(e) {
        dest.emit('error', e);
    });

    return input.pipe(dest);
    
}

exports.pipe = pipe;