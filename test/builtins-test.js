'use strict';
var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var createLassoContext = require('./mock/create-lasso-context');

describe('lasso-require/builtins' , function() {
    it('should correctly resolve default builtins', function() {
        var fromDir = __dirname;
        var lassoContext = createLassoContext();

        expect(lassoContext.resolve('assert', fromDir) != null).to.equal(true);
        expect(lassoContext.resolve('buffer', fromDir) != null).to.equal(true);
        expect(lassoContext.resolve('events', fromDir) != null).to.equal(true);
        expect(lassoContext.resolve('path', fromDir) != null).to.equal(true);
        expect(lassoContext.resolve('process', fromDir) != null).to.equal(true);
        expect(lassoContext.resolve('stream', fromDir) != null).to.equal(true);
        expect(lassoContext.resolve('util', fromDir) != null).to.equal(true);
        expect(lassoContext.resolve('lasso-loader', fromDir) != null).to.equal(true);
        expect(lassoContext.resolve('raptor-loader', fromDir) != null).to.equal(true);
        expect(lassoContext.resolve('string_decoder', fromDir) != null).to.equal(true);
    });

    it('should allow custom builtins', function() {
        var fromDir = __dirname;
        var lassoContext = createLassoContext({
            resolver: {
                builtins: {
                    foo: require.resolve('./fixtures/builtin-foo')
                }
            }
        });

        expect(lassoContext.resolve('foo', fromDir) != null).to.equal(true);
        expect(() => lassoContext.resolve('bar', fromDir)).to.throw();
    });

    it('should allow custom builtins (legacy)', function() {
        var fromDir = __dirname;
        var lassoContext = createLassoContext({
            require: {
                builtins: {
                    foo: require.resolve('./fixtures/builtin-foo')
                }
            }
        });

        expect(lassoContext.resolve('foo', fromDir) != null).to.equal(true);
        expect(() => lassoContext.resolve('bar', fromDir)).to.throw();
    });

    //
    // it('should allow additional builtins', function() {
    //
    //     var builtins = require('../lib/builtins').getBuiltins({
    //         foo: require.resolve('./fixtures/foo-shim')
    //     });
    //     expect(builtins.buffer).to.contain('node_modules/buffer-browserify');
    //     expect(builtins.events).to.contain('node_modules/events');
    //     expect(builtins.foo).to.contain('foo-shim.js');
    //
    //     // console.log('builtins:', builtins);
    // });
});
