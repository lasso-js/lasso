'use strict';

var stream = require('stream');

class MyTransform extends stream.Transform {
    constructor(file) {
        super();
        this.file = file;
        this.data = '';
    }

    _transform(buf, enc, callback) {
        // Collect all of the data as it is streamed in and just concatenate to a our data string
        // but don't actually stream out any data yet
        this.data += buf;
        callback();
    }

    _flush(callback) {
        this.push(this.data.replace(/world/g, 'WORLD'));
        callback();
    }
}

module.exports = function(file) {
    return new MyTransform(file);
};