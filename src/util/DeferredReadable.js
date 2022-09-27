const Readable = require('stream').Readable;
const inherit = require('raptor-util/inherit');

function DeferredReadable(startFn, options) {
    if (startFn && typeof startFn !== 'function') {
        options = startFn;
        startFn = null;
    }

    DeferredReadable.$super.call(this, options);

    let readCalled = false;
    let wrappedStream = null;
    let paused = false;
    const _this = this;

    let ended = false;
    let chunkCount = 0;

    let queuedEmits;

    this.on('ready', function (wrappedStream) {
        _this.setWrappedStream(wrappedStream);
    });

    function startReadingWrappedStream() {
        wrappedStream
            .on('end', function() {
                ended = true;
                _this.push(null);
            })
            .on('error', function(err) {
                _this.emit('error', err);
            })
            .on('data', function(data) {
                chunkCount++;
                if (_this.push(data) === false) {
                    paused = true;
                    wrappedStream.pause();
                }
            })
            .resume();
    }

    this.emit = function(type) {
        if (readCalled || type !== 'error') {
            Readable.prototype.emit.apply(this, arguments);
        } else {
            // Queue up error events if we haven't started reading
            if (!queuedEmits) {
                queuedEmits = [arguments];
            } else {
                queuedEmits.push(arguments);
            }
        }
    };

    this._read = function() {
        if (readCalled) {
            if (wrappedStream && paused) {
                paused = false;
                wrappedStream.resume();
            }
        } else {
            readCalled = true;

            if (queuedEmits) {
                for (let i = 0, len = queuedEmits.length; i < len; i++) {
                    Readable.prototype.emit.apply(this, queuedEmits[i]);
                }
                queuedEmits = undefined;
            }

            if (wrappedStream) {
                startReadingWrappedStream();
            } else if (startFn) {
                const result = startFn.call(this);

                if (result) {
                    this.setWrappedStream(result);
                }
            }
        }
    };

    this.setWrappedStream = function(stream) {
        wrappedStream = stream;

        if (readCalled) {
            startReadingWrappedStream();
        }
    };

    this.toString = function() {
        return '[DeferredReadable readCalled=' + readCalled + ', ended=' + ended + ', chunkCount=' + chunkCount + ', wrappedStream=' + wrappedStream + ']';
    };
}

inherit(DeferredReadable, Readable);

module.exports = DeferredReadable;
