var Readable = require('stream').Readable;
var inherit = require('raptor-util/inherit');

function DeferredReadable(startFn, options) {
    DeferredReadable.$super.call(this, options);


    var readCalled = false;
    var wrappedStream = null;
    var paused = false;

    this._read = function() {

        if (readCalled) {
            if (wrappedStream && paused) {
                wrappedStream.resume();
            }
        } else {
            readCalled = true;
            wrappedStream = startFn.call(this);

            var _this = this;

            if (wrappedStream) {
                wrappedStream
                    .on('data', function(data) {
                        if (_this.push(data) === false) {
                            wrappedStream.pause();
                        }
                    })
                    .on('end', function() {
                        _this.push(null);
                    })
                    .resume();
            }
        }
    };
}

inherit(DeferredReadable, Readable);

module.exports = DeferredReadable;
