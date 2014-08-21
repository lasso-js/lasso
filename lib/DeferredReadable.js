var Readable = require('stream').Readable;
var util = require('util');

function DeferredReadable(startFn, options) {
    Readable.call(this, options);
    this._startFn = startFn;
    this._readCalled = false;
}

util.inherits(DeferredReadable, Readable);

DeferredReadable.prototype._read = function() {
    if (this._readCalled) {
        return;
    }

    this._readCalled = true;
    this._startFn.call(this);
};

module.exports = DeferredReadable;