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
                next();
            } else {
                curStream.on('end', next);
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
                next();
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
