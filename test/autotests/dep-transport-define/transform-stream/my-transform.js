'use strict';

var expect = require('chai').expect;
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
        this.push(this.data.replace(/hello/g, 'WORLD') + '|filename=' + this.file);
        callback();
    }
}

module.exports = {
    id: __filename,
    stream: true,
    createTransform() {
        return function myTransform(file, lassoContext) {
            expect(lassoContext.isMockLassoContext).to.equal(true);
            return new MyTransform(file);
        };
    }
};