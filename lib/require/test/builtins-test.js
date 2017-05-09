'use strict';
var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var buildPluginConfig = require('../src/build-plugin-config');
var MockLassoContext = require('./mock/MockLassoContext');

describe('lasso-require/builtins' , function() {
    it('should correctly resolve default builtins', function() {
        var pluginConfig = {};
        pluginConfig.rootDir = __dirname;
        var mockPluginConfig = buildPluginConfig(pluginConfig);
        var lassoContext = new MockLassoContext();

        var fromDir = __dirname;
        var resolver = mockPluginConfig.resolver;

        expect(resolver.resolveRequire('assert', fromDir, lassoContext) != null).to.equal(true);
        expect(resolver.resolveRequire('buffer', fromDir, lassoContext) != null).to.equal(true);
        expect(resolver.resolveRequire('events', fromDir, lassoContext) != null).to.equal(true);
        expect(resolver.resolveRequire('path', fromDir, lassoContext) != null).to.equal(true);
        expect(resolver.resolveRequire('process', fromDir, lassoContext) != null).to.equal(true);
        expect(resolver.resolveRequire('stream', fromDir, lassoContext) != null).to.equal(true);
        expect(resolver.resolveRequire('util', fromDir, lassoContext) != null).to.equal(true);
        expect(resolver.resolveRequire('lasso-loader', fromDir, lassoContext) != null).to.equal(true);
        expect(resolver.resolveRequire('raptor-loader', fromDir, lassoContext) != null).to.equal(true);
        expect(resolver.resolveRequire('string_decoder', fromDir, lassoContext) != null).to.equal(true);
    });

    it('should allow custom builtins', function() {
        var pluginConfig = {
            builtins: {
                foo: require.resolve('./fixtures/builtin-foo')
            }
        };
        pluginConfig.rootDir = __dirname;
        var mockPluginConfig = buildPluginConfig(pluginConfig);
        var lassoContext = new MockLassoContext();

        var fromDir = __dirname;
        var resolver = mockPluginConfig.resolver;

        expect(resolver.resolveRequire('foo', fromDir, lassoContext) != null).to.equal(true);

        expect(resolver.resolveRequire('bar', fromDir, lassoContext) != null).to.equal(false);
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