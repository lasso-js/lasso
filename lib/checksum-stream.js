var crypto = require('crypto');
var eventStream = require('event-stream');
var ok = require('assert').ok;

function calculate(input, options) {
    options = options || {};

    ok(input, '"input" is required');

    var shasum = crypto.createHash('sha1');

    var dest = eventStream.through(function write(data) {
            shasum.update(data);
            this.queue(data);
        },
        function end() {
            var checksum = shasum.digest('hex');
            shasum = null;
            this.emit('checksum', checksum);
            this.queue(null);
        });

    input.on('error', function(e) {
        dest.emit('error', e);
    });


    if (options.pause !== false) {
        dest.pause();    
    }

    return input.pipe(dest);
    
}

exports.calculate = calculate;