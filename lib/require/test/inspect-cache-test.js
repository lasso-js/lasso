'use strict';

var nodePath = require('path');
var chai = require('chai');
chai.config.includeStack = true;
var expect = require('chai').expect;
var fs = require('fs');
var inspectCache = require('../src/inspect-cache');
var nodePath = require('path');
var buildPluginConfig = require('../src/build-plugin-config');
var MockLassoContext = require('./mock/MockLassoContext');

describe('lasso-require/util/inspect' , function() {
    it('should read from cache with matching last modified', (done) => {
        var pluginConfig = {
            builtins: {
                foo: require.resolve('./fixtures/builtin-foo')
            }
        };
        pluginConfig.rootDir = __dirname;
        var mockPluginConfig = buildPluginConfig(pluginConfig);
        var lassoContext = new MockLassoContext();
        lassoContext.mockEnableCachingForCache('lasso-require/inspect');

        var path = nodePath.join(__dirname, 'fixtures/inspect-cache/foo.js');
        var readCount = 0;

        function createReadStream() {
            expect(arguments.length).to.equal(0);
            readCount++;
            return fs.createReadStream(path, { encoding: 'utf8' });
        }

        function getLastModified() {
            return Promise.resolve(10);
        }

        inspectCache.inspectCached(path, {createReadStream, getLastModified}, lassoContext, mockPluginConfig)
            .then((inspectResult) => {
                expect(readCount).to.equal(1);
                expect(inspectResult.fromCache).to.equal(undefined);

                // Inspect the same file... should come from the cache
                return inspectCache.inspectCached(path, {createReadStream, getLastModified}, lassoContext, mockPluginConfig);
            })
            .then((inspectResult) => {
                expect(inspectResult.fromCache).to.equal(true);
                expect(readCount).to.equal(1);
            })
            .then(done)
            .catch(done);
    });

    it('should still read from cache without getLastModified', (done) => {
        var pluginConfig = {
            builtins: {
                foo: require.resolve('./fixtures/builtin-foo')
            }
        };
        pluginConfig.rootDir = __dirname;
        var mockPluginConfig = buildPluginConfig(pluginConfig);
        var lassoContext = new MockLassoContext();
        lassoContext.mockEnableCachingForCache('lasso-require/inspect');

        var path = nodePath.join(__dirname, 'fixtures/inspect-cache/foo.js');
        var readCount = 0;

        function createReadStream() {
            expect(arguments.length).to.equal(0);
            readCount++;
            return fs.createReadStream(path, { encoding: 'utf8' });
        }

        function getLastModified() {
            return Promise.resolve(-1);
        }

        inspectCache.inspectCached(path, {createReadStream, getLastModified}, lassoContext, mockPluginConfig)
            .then((inspectResult) => {
                expect(readCount).to.equal(1);
                expect(inspectResult.fromCache).to.equal(undefined);

                // Inspect the same file... should come from the cache
                return inspectCache.inspectCached(path, {createReadStream, getLastModified}, lassoContext, mockPluginConfig);
            })
            .then((inspectResult) => {
                expect(inspectResult.fromCache).to.equal(true);
                expect(readCount).to.equal(2);
            })
            .then(done)
            .catch(done);
    });

});