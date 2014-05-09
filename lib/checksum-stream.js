var crypto = require('crypto');
var eventStream = require('event-stream');

module.exports = function checksumStream() {
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

    var oldOn = dest.on;
    dest.on = function(event, callback) {
        if (event === 'checksum' && checksum) {
            callback.call(this, checksum);
            return this;
        } else {
            return oldOn.apply(this, arguments);
        }
    };

    return dest;
    
};