var Readable = require('stream').Readable;

var inherit = require('raptor-util/inherit');

function CombinedStream(options) {
    CombinedStream.$super.call(this, options);

    var streams = this.streams = [];
    var combined = this;
    var separator;
    var curStream;
    var i = -1;
    var len;
    var paused = false;
    var reading = false;

    if (options) {
        separator = options.separator;
        delete options.separator;
    }

    function onError(err) {
        combined.emit('error', err);
    }

    function onData(chunk) {
        if (combined.push(chunk) === false) {
            paused = true;
            curStream.pause();
        }
    }

    var depth = 0;

    /*
    Node.js internally uses process.nextTick() during stream data
    flow events. Node.js checks to make sure that process.nextTick()
    is not called with too much recursion because this will starve
    I/O event processing. The dependency streams may have read all of
    their data so process.nextTick() could be called recursively more than
    the allowed limit. The recommended approach for avoiding this limit
    is to use setImmediate() to give the event loop a chance to handle
    I/O events.

    Recursive process.nextTick detected" from within stream code #6065
    https://github.com/joyent/node/issues/6065

    stream: readable _read blocking script execution #7401
    https://github.com/joyent/node/issues/7401
    */
    function cautiousNext() {
        depth++;
        if (depth > 100) {
            depth = 0;
            setImmediate(next);
        } else {
            next();
        }
    }

    function next() {
        if (curStream) {
            combined.emit('endStream', {
                stream: curStream,
                index: i
            });
        }

        if (++i >= len) {
            // we're done
            combined.push(null);
        } else {
            if (separator && curStream) {
                combined.push(separator);
            }
            combined.curStream = curStream = streams[i];
            combined.emit('beginStream', {
                stream: curStream,
                index: i
            });

            if (typeof curStream === 'string') {
                onData(curStream);
                cautiousNext();
            } else {
                curStream.on('end', cautiousNext);
                curStream.on('error', onError);
                curStream.on('data', onData);
                // make sure the current stream is resumed
                curStream.resume();
            }
        }
    }

    this._read = function() {

        if (reading) {
            if (paused) {
                curStream.resume();
            }
        } else {
            reading = true;
            len = streams.length;

            if (len === 0) {
                combined.push(null);
            } else {
                cautiousNext();
            }

        }
    };
}

CombinedStream.prototype.addStream = function(stream) {
    this.streams.push(stream);
};

CombinedStream.prototype.getStream = function(index) {
    return this.streams[index];
};

CombinedStream.prototype.getStreamCount = function(stream) {
    return this.streams.length;
};

CombinedStream.prototype.forEachStream = function(fn) {
    return this.streams.forEach(fn);
};

inherit(CombinedStream, Readable);

module.exports = CombinedStream;
