'use strict';

const nodePath = require('path');
const chai = require('chai');
chai.config.includeStack = true;
const expect = require('chai').expect;
const fs = require('fs');
const inspectCache = require('../lib/require/inspect-cache');
const buildPluginConfig = require('../lib/require/build-plugin-config');
const MockLassoContext = require('./mock/MockLassoContext');

describe('lasso-require/util/inspect', function() {
    it('should read from cache with matching last modified', async () => {
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

        let inspectResult = await inspectCache.inspectCached(path, {createReadStream, getLastModified}, lassoContext, mockPluginConfig);
        expect(readCount).to.equal(1);
        expect(inspectResult.fromCache).to.equal(undefined);

        // Inspect the same file... should come from the cache
        inspectResult = await inspectCache.inspectCached(path, {createReadStream, getLastModified}, lassoContext, mockPluginConfig);
        expect(inspectResult.fromCache).to.equal(true);
        expect(readCount).to.equal(1);
    });

    it('should still read from cache without getLastModified', async () => {
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

        // TODO: Change should this be removed in this test?
        function getLastModified() {
            return Promise.resolve(-1);
        }

        let inspectResult = await inspectCache.inspectCached(path, {createReadStream, getLastModified}, lassoContext, mockPluginConfig);
        expect(readCount).to.equal(1);
        expect(inspectResult.fromCache).to.equal(undefined);

        // Inspect the same file... should come from the cache
        inspectResult = await inspectCache.inspectCached(path, {createReadStream, getLastModified}, lassoContext, mockPluginConfig);
        expect(inspectResult.fromCache).to.equal(true);
        expect(readCount).to.equal(2);
    });
});
