'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
var expect = chai.expect;

describe('node-require-no-op', function() {

    it('should allow for optimizing a page with flags', function() {
        require('../node-require-no-op').enable('.xfoo');
        require('../node-require-no-op').enable('xbar');
        require('../node-require-no-op').enable(['yfoo', '.ybar']);

        var test = require('./fixtures/noop/test.xfoo');
        expect(Object.keys(test).length).to.equal(0);
        require('./fixtures/noop/test.xbar');
        require('./fixtures/noop/test.yfoo');
        require('./fixtures/noop/test.yfoo');
    });
});
