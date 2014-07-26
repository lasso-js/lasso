var crypto = require('crypto');
var eventStream = require('event-stream');

module.exports = function fingerprintStream() {
    var shasum = crypto.createHash('sha1');
    var fingerprint;

    var dest = eventStream.through(
        function write(data) {
            shasum.update(data);
            this.queue(data);
        },
        function end() {
            fingerprint = shasum.digest('hex');
            shasum = null;
            this.emit('fingerprint', fingerprint);
            this.queue(null);
        });

    var oldOn = dest.on;
    dest.on = function(event, callback) {
        if (event === 'fingerprint' && fingerprint) {
            callback.call(this, fingerprint);
            return this;
        } else {
            return oldOn.apply(this, arguments);
        }
    };

    return dest;
    
};