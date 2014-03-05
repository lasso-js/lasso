var crypto = require('crypto');
var eventStream = require('event-stream');
var ok = require('assert').ok;

function calculate(input, options) {
    options = options || {};

    ok(input, '"input" is required');

    var shasum = crypto.createHash('sha1');
    var checksum;

    var dest = eventStream.through(function write(data) {
            shasum.update(data);
            this.queue(data);
        },
        function end() {
            checksum = shasum.digest('hex');
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

    var oldOn = dest.on;
    dest.on = function(event, callback) {
        if (event === 'checksum' && checksum) {
            callback.call(this, checksum);
            return this;
        } else {
            return oldOn.apply(this, arguments);
        }
    };

    return input.pipe(dest);
    
}

exports.calculate = calculate;