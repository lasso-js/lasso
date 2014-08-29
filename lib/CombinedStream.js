var DeferredReadable = require('./DeferredReadable');

var util = require('util');

function CombinedStream(options) {
    var streams = this.streams = [];

    var combined = this;
    var separator;

    if (options) {
        separator = options.separator;
        delete options.separator;
    }

    // This function will be called once when it is
    // time to start reading data. The data flow starts
    // when we attach a "readable" event.
    var startFn = function() {
        len = streams.length;

        if (len === 0) {
            combined.push(null);
            return combined;
        }

        prepareCurStream();
    };

    DeferredReadable.call(this, startFn, options);

    var curStream;

    var i = 0;
    var len;

    var onError = function(err) {
        combined.emit('error', err);
    };

    var onData = function(chunk) {
        combined.push(chunk);
    };

    var next = function() {
        combined.emit('endStream', {
            stream: curStream,
            index: i
        });

        i++;
        if (i >= len) {
            // we're done
            combined.push(null);
        } else {

            if (separator) {
                combined.push(separator);
            }

            prepareCurStream();
        }
    };

    var prepareCurStream = function() {
        combined.curStream = curStream = streams[i];

        combined.emit('beginStream', {
            stream: curStream,
            index: i
        });

        curStream.on('end', next);
        curStream.on('error', onError);
        curStream.on('data', onData);

        // make sure the current stream is resumed
        curStream.resume();
    };

    return combined;
}

util.inherits(CombinedStream, DeferredReadable);

CombinedStream.prototype.pause = function() {
    this.curStream.pause();
};

CombinedStream.prototype.resume = function() {
    this.curStream.resume();
};

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

module.exports = CombinedStream;