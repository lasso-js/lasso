var inherit = require('raptor-util/inherit');

var Transform = require('stream').Transform;
var Readable = require('stream').Readable;

// ReplayStream
function ReplayStream(chunks, options) {
    ReplayStream.$super.call(this, options);

    this._chunks = chunks;
    this._pos = 0;
}

ReplayStream.prototype._read = function(size) {
    while(this._pos < this._chunks.length) {
        if (this.push(this._chunks[this._pos++]) === false) {
            break;
        }
    }

    if (this._pos === this._chunks.length) {
        this.push(null);
    }
};


inherit(ReplayStream, Readable);

// CachingStream
function CachingStream(options) {
    CachingStream.$super.call(this, options);
    this._chunks = [];
}

CachingStream.prototype._transform = function(chunk, encoding, callback) {
    this._chunks.push(chunk); // Cache the chunk
    this.push(chunk);
    callback();
};

CachingStream.prototype._flush = function(callback) {
    callback();
};

CachingStream.prototype.createReplayStream = function(options) {
    return new ReplayStream(this._chunks, options);
};

inherit(CachingStream, Transform);

exports.create = function(options) {
    return new CachingStream(options);
};
