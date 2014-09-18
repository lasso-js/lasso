var inherit = require('raptor-util/inherit');

var Transform = require('stream').Transform;
var Readable = require('stream').Readable;

// ReplayStream
function ReplayStream(cachingStream, options) {
    ReplayStream.$super.call(this, options);

    var _this = this;
    var _chunks = cachingStream._chunks;
    var _pos = 0;

    function continueReading() {
        while(_pos < _chunks.length) {
            if (_this.push(_chunks[_pos++]) === false) {
                break;
            }
        }
    }

    if (cachingStream._finished === false) {

        cachingStream
            .on('_newData', continueReading)
            .once('end', function() {
                cachingStream.removeListener('_newData', continueReading);
            });
    }

    this._read = continueReading;

    this.toString = function(size) {
        return '[ReplayStream chunkCount=' + _chunks.length + ', pos=' + _pos + ']';
    };
}

inherit(ReplayStream, Readable);

// CachingStream
function CachingStream(options) {
    CachingStream.$super.call(this, options);
    this._chunks = [];
    this._finished = false;
}

CachingStream.prototype._transform = function(chunk, encoding, callback) {
    // console.log(module.id, 'caching stream push: '÷, chunk.toString('utf8'));
    this._chunks.push(chunk); // Cache the chunk
    this.emit('_newData');

    this.push(chunk);
    callback();
};

CachingStream.prototype._flush = function(callback) {
    // console.log(module.id, 'caching stream end');
    this._chunks.push(null);
    this.emit('_newData');
    this._finished = true;
    callback();
};

CachingStream.prototype.createReplayStream = function(options) {
    return new ReplayStream(this, options);
};

CachingStream.prototype.toString = function() {
    return '[CachingStream len=' + this._chunks.length + ']';
};

inherit(CachingStream, Transform);

exports.create = function(options) {
    return new CachingStream(options);
};
