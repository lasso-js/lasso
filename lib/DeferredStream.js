var Readable = require('stream').Readable;
var util = require('util');

function noop() {}

function DeferredStream(startFn, options) {
    var self = this;

    Readable.call(this, options);

    // When _read is called, we need to start pushing data
    self._read = function() {
        self._read = noop;
        startFn.call(self);
    };

    return self;
}

util.inherits(DeferredStream, Readable);

module.exports = DeferredStream;