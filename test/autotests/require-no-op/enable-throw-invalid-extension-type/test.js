'use strict';
var expect = require('chai').expect;

exports.check = function(nodeRequireNoOp) {
    nodeRequireNoOp.enable(true);
};

exports.checkError = function (e) {
    expect(e.message).to.equal('Expected extension to be a string. Actual: true');
};
