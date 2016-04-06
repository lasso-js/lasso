'use strict';
var expect = require('chai').expect;

exports.check = function(nodeRequireNoOp) {
    nodeRequireNoOp.enable('.xfoo');
    nodeRequireNoOp.enable('xbar');
    nodeRequireNoOp.enable(['yfoo', '.ybar']);

    var test = require('./test.xfoo');
    expect(Object.keys(test).length).to.equal(0);
    require('./test.xbar');
    require('./test.yfoo');
    require('./test.yfoo');
};