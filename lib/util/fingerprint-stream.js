var crypto = require('crypto');
var inherit = require('raptor-util/inherit');
var Transform = require('stream').Transform;

function FingerprintStream(options) {
    FingerprintStream.$super.call(this, options);
    this._shasum = crypto.createHash('sha1');
    this._fingerprint = null;
}

FingerprintStream.prototype._transform = function(chunk, encoding, callback) {
    this._shasum.update(chunk);
    this.push(chunk);
    callback();
};

FingerprintStream.prototype._flush = function(callback) {
    this._fingerprint = this._shasum.digest('hex');
    this._shasum = null;
    this.emit('fingerprint',this._fingerprint);

    callback();
};

FingerprintStream.prototype.on = function(event, callback) {
    if (event === 'fingerprint' && this._fingerprint) {
        callback.call(this, this._fingerprint);
        return this;
    } else {
        return FingerprintStream.$super.prototype.on.apply(this, arguments);
    }
};

inherit(FingerprintStream, Transform);

exports.create = function() {
    return new FingerprintStream();
};
