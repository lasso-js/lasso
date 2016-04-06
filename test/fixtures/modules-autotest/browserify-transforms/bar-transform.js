'use strict';

var Transform = require('stream').Transform;

class MyTransform extends Transform {
    constructor(options) {
        super(options);
        this.string = '';
    }

    _transform(data, encoding, callback) {
        this.string += data;
        callback();
    }

    _flush(callback) {
        var string = this.string.replace(/bar/g, 'BAR');
        this.push(string);
        callback();
    }
}

module.exports = function(file, opts) {
    return new MyTransform();
};